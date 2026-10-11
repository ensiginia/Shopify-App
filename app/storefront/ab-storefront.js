(() => {
  if (customElements.get("ss-ab-experiment")) return;
  const root = () => window.Shopify?.routes?.root || "/";
  const privacyAllowed = () =>
    window.Shopify?.customerPrivacy?.analyticsProcessingAllowed() === true;
  const request = async (url, data) => {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...(data
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        : {}),
    });
    const body = await response.json();
    if (!response.ok)
      throw new Error(
        body.description ||
          body.error ||
          "This action could not be completed. Please try again.",
      );
    return body;
  };
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const loadPrivacy = () =>
    new Promise((resolve) => {
      if (window.Shopify?.customerPrivacy) return resolve(true);
      if (!window.Shopify?.loadFeatures) return resolve(false);
      window.Shopify.loadFeatures(
        [{ name: "consent-tracking-api", version: "0.1" }],
        (error) => resolve(!error),
      );
    });
  class Experiment extends HTMLElement {
    connectedCallback() {
      if (this.initialized || window.Shopify?.designMode) return;
      this.initialized = true;
      this.busy = false;
      this.consentHandler = () => this.consentChanged();
      document.addEventListener("visitorConsentCollected", this.consentHandler);
      this.init();
    }
    disconnectedCallback() {
      document.removeEventListener(
        "visitorConsentCollected",
        this.consentHandler,
      );
      this.observer?.disconnect();
      this.drawer?.remove();
    }
    async init() {
      const generation = (this.generation = (this.generation || 0) + 1);
      if (!(await loadPrivacy()) || !privacyAllowed()) return;
      try {
        this.visitor = localStorage.getItem("ss-ab-anonymous-v1");
        if (!this.visitor || !/^[a-zA-Z0-9-]{8,80}$/.test(this.visitor)) {
          this.visitor = crypto.randomUUID();
          localStorage.setItem("ss-ab-anonymous-v1", this.visitor);
        }
      } catch {
        return;
      } // No persistent assignment => keep the theme's native flow.
      const proxy = this.dataset.proxy;
      if (
        !proxy?.startsWith("/apps/") ||
        proxy.includes("//") ||
        proxy.includes("?")
      )
        return;
      const url = new URL(proxy, location.origin);
      url.searchParams.set("surface", this.dataset.surface);
      url.searchParams.set("currency", this.dataset.currency);
      url.searchParams.set("visitor", this.visitor);
      if (this.dataset.productId)
        url.searchParams.set("productId", this.dataset.productId);
      try {
        const test = (await request(url.toString())).test;
        if (
          !test ||
          !privacyAllowed() ||
          !this.isConnected ||
          generation !== this.generation
        )
          return;
        this.test = test;
        if (this.dataset.surface === "Carts") {
          this.button = element(
            "button",
            this.dataset.cartLabel || "View cart",
            "ss-ab-open",
          );
          this.button.type = "button";
          this.button.addEventListener("click", () => this.openCart());
          this.status = element("p", "", "ss-ab-feedback");
          this.status.setAttribute("role", "status");
          this.replaceChildren(this.button, this.status);
        } else {
          this.product = await request(
            `${root()}products/${encodeURIComponent(this.dataset.productHandle)}.js`,
          );
          await this.renderBundle();
          this.observer = new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) {
                this.observer.disconnect();
                this.expose().catch(() => this.replaceChildren());
              }
            },
            { threshold: 0.5 },
          );
          this.observer.observe(this);
        }
      } catch {
        this.replaceChildren();
      }
    }
    async consentChanged() {
      if (!privacyAllowed()) {
        this.generation = (this.generation || 0) + 1;
        this.observer?.disconnect();
        this.replaceChildren();
        this.drawer?.remove();
        this.test = null;
        this.token = null;
        this.exposurePromise = null;
        try {
          localStorage.removeItem("ss-ab-anonymous-v1");
          await request(`${root()}cart/update.js`, {
            attributes: { _ss_ab_attribution: "" },
          });
        } catch {
          /* Native cart remains available. */
        }
      } else if (!this.test) await this.init();
    }
    async expose() {
      if (!privacyAllowed())
        throw new Error("Tracking permission is unavailable.");
      if (this.test.rollout) return;
      if (this.exposurePromise) return this.exposurePromise;
      const test = this.test;
      this.exposurePromise = request(this.dataset.proxy, {
        intent: "expose",
        consent: true,
        id: this.test.id,
        visitor: this.visitor,
        currency: this.dataset.currency,
        productId: this.test.productId,
      })
        .then(async (data) => {
          if (
            !privacyAllowed() ||
            this.test !== test ||
            data.variant !== test.variant
          )
            throw new Error(
              "The test assignment changed. Refresh to continue.",
            );
          this.token = data.token;
          await request(root() + "cart/update.js", {
            attributes: { _ss_ab_attribution: this.token },
          });
          if (!privacyAllowed()) {
            await request(root() + "cart/update.js", {
              attributes: { _ss_ab_attribution: "" },
            });
            throw new Error("Tracking permission was withdrawn.");
          }
        })
        .catch((error) => {
          this.exposurePromise = null;
          throw error;
        });
      return this.exposurePromise;
    }
    format(amount) {
      return new Intl.NumberFormat(document.documentElement.lang || "en", {
        style: "currency",
        currency: this.test.currency,
      }).format(amount / 100);
    }
    async attachOffer(cart) {
      if (!privacyAllowed())
        throw new Error("Tracking permission is unavailable.");
      await this.expose();
      const existing = (cart.discount_codes || [])
        .filter((d) => !/^SSAB-/i.test(d.code))
        .map((d) => d.code);
      // Preserve other merchant/customer codes. Shopify chooses compatible discounts.
      const discounts = [
        ...existing,
        ...(this.test.discountCode ? [this.test.discountCode] : []),
      ];
      const updated = await request(`${root()}cart/update.js`, {
        attributes: { _ss_ab_attribution: this.test.rollout ? "" : this.token },
        discount: discounts.join(","),
      });
      if (
        this.test.discountCode &&
        updated.discount_codes?.some(
          (d) => d.code === this.test.discountCode && d.applicable === false,
        )
      ) {
        // Minimum-quantity/subtotal requirements can be unmet; never pretend a discount applied.
        this.discountPending = true;
      } else this.discountPending = false;
      return updated;
    }
    async act(button, action) {
      if (this.busy) return;
      this.busy = true;
      button.disabled = true;
      this.setAttribute("aria-busy", "true");
      try {
        await action();
      } catch (error) {
        const feedback = this.drawer?.open
          ? this.feedback
          : this.status || this.feedback;
        if (feedback) {
          feedback.textContent = error.message;
          feedback.setAttribute("role", "alert");
          const fallback = element("a", "Open standard cart");
          fallback.href = root() + "cart";
          feedback.append(document.createTextNode(" "), fallback);
        }
      } finally {
        this.busy = false;
        button.disabled = false;
        this.removeAttribute("aria-busy");
      }
    }
    async renderBundle() {
      const v = this.test.settings;
      const panel = element("section", undefined, "ss-ab-panel");
      panel.append(element("h3", `Buy ${v.quantity}, save ${v.discount}%`));
      const select = element("select");
      select.setAttribute("aria-label", "Choose product variant");
      this.product.variants
        .filter((p) => p.available)
        .forEach((p) => {
          const option = element("option", p.public_title || p.title);
          option.value = String(p.id);
          select.append(option);
        });
      if (!select.options.length) return;
      const price = element("p", undefined, "ss-ab-price");
      const showPrice = () => {
        const productVariant = this.product.variants.find(
          (p) => String(p.id) === select.value,
        );
        price.textContent = `Offer subtotal: ${this.format(Math.round(productVariant.price * v.quantity * (1 - v.discount / 100)))}`;
      };
      select.addEventListener("change", showPrice);
      showPrice();
      const button = element("button", "Add bundle to cart", "ss-ab-primary");
      button.type = "button";
      button.style.backgroundColor = v.color;
      this.feedback = element("p", "", "ss-ab-feedback");
      this.feedback.setAttribute("role", "status");
      button.addEventListener("click", () =>
        this.act(button, async () => {
          await this.expose();
          await request(`${root()}cart/add.js`, {
            items: [{ id: Number(select.value), quantity: v.quantity }],
          });
          const cart = await this.attachOffer(
            await request(`${root()}cart.js`),
          );
          this.feedback.textContent = this.discountPending
            ? "Items added. The offer could not be applied yet; check your cart and existing discounts."
            : `Bundle added. Cart total: ${this.format(cart.total_price)}.`;
          const link = element("a", "View cart");
          link.href = `${root()}cart`;
          this.feedback.append(document.createTextNode(" "), link);
          document.dispatchEvent(
            new CustomEvent("cart:updated", { detail: { cart } }),
          );
        }),
      );
      panel.append(
        select,
        price,
        button,
        element(
          "small",
          "Final price and discount eligibility are confirmed in your cart and checkout.",
        ),
        this.feedback,
      );
      this.replaceChildren(panel);
    }
    async openCart() {
      await this.act(this.button, async () => {
        if (!this.drawer) {
          this.drawer = element("dialog", undefined, "ss-ab-drawer");
          this.drawer.setAttribute("aria-label", "Shopping cart");
          document.body.append(this.drawer);
          this.drawer.addEventListener("click", (e) => {
            if (e.target === this.drawer) this.drawer.close();
          });
        }
        await this.renderCart(await request(`${root()}cart.js`));
        if (!this.drawer.open) this.drawer.showModal();
        await this.expose();
      });
    }
    async renderCart(cart) {
      const v = this.test.settings;
      const content = element("div", undefined, "ss-ab-drawer-content");
      const heading = element("header");
      const close = element("button", "Close");
      close.type = "button";
      close.addEventListener("click", () => this.drawer.close());
      heading.append(element("h2", `Your cart (${cart.item_count})`), close);
      content.append(heading);
      if (cart.currency !== this.test.currency)
        throw new Error(
          "This offer is unavailable in the current currency. Use your store's standard cart.",
        );
      if (v.reward > 0) {
        const remaining = Math.max(
          0,
          v.reward * 100 - cart.items_subtotal_price,
        );
        content.append(
          element(
            "p",
            remaining
              ? `Add ${this.format(remaining)} to unlock free shipping.`
              : "Free-shipping goal reached. Eligibility is confirmed at checkout.",
            "ss-ab-goal",
          ),
        );
      }
      for (const item of cart.items) {
        const line = element("div", undefined, "ss-ab-line");
        const description = element("div");
        description.append(
          element("strong", item.product_title),
          element("small", item.variant_title || ""),
        );
        const quantity = element("input");
        quantity.type = "number";
        quantity.min = "0";
        quantity.max = "100";
        quantity.value = String(item.quantity);
        quantity.setAttribute(
          "aria-label",
          `Quantity for ${item.product_title}`,
        );
        const update = element("button", "Update");
        update.type = "button";
        update.addEventListener("click", () =>
          this.act(update, async () => {
            const n = Number(quantity.value);
            if (!Number.isInteger(n) || n < 0 || n > 100)
              throw new Error("Quantity must be between 0 and 100.");
            await this.renderCart(
              await request(`${root()}cart/change.js`, {
                id: item.key,
                quantity: n,
              }),
            );
          }),
        );
        line.append(
          description,
          element("span", this.format(item.final_line_price)),
          quantity,
          update,
        );
        content.append(line);
      }
      if (!cart.item_count) content.append(element("p", "Your cart is empty."));
      if (
        v.upsell &&
        this.test.upsellVariantId &&
        this.test.upsellHandle &&
        cart.item_count
      ) {
        const product = await request(
          root() +
            "products/" +
            encodeURIComponent(this.test.upsellHandle) +
            ".js",
        ).catch(() => null);
        const recommended = product?.variants.find(
          (item) =>
            String(item.id) === this.test.upsellVariantId.split("/").pop() &&
            item.available,
        );
        if (recommended) {
          const offer = element(
            "button",
            "Add " + product.title + " · " + this.format(recommended.price),
            "ss-ab-upsell",
          );
          offer.type = "button";
          offer.addEventListener("click", () =>
            this.act(offer, async () => {
              await request(`${root()}cart/add.js`, {
                items: [
                  {
                    id: Number(this.test.upsellVariantId.split("/").pop()),
                    quantity: 1,
                  },
                ],
              });
              await this.renderCart(await request(`${root()}cart.js`));
            }),
          );
          content.append(offer);
        }
      }
      content.append(
        element("p", `Subtotal: ${this.format(cart.items_subtotal_price)}`),
      );
      const checkout = element("button", v.checkout, "ss-ab-primary");
      checkout.type = "button";
      checkout.style.backgroundColor = v.color;
      checkout.disabled = !cart.item_count;
      this.feedback = element("p", "", "ss-ab-feedback");
      this.feedback.setAttribute("role", "status");
      checkout.addEventListener("click", () =>
        this.act(checkout, async () => {
          await this.attachOffer(await request(`${root()}cart.js`));
          window.location.assign(`${root()}checkout`);
        }),
      );
      content.append(checkout, this.feedback);
      this.drawer.replaceChildren(content);
    }
  }
  customElements.define("ss-ab-experiment", Experiment);
})();
