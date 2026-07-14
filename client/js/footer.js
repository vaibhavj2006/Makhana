document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('footer');
  if (!el) return;
  el.innerHTML = `
    <div class="footer-inner">
      <div>
        <a href="index.html" class="brand" style="color:var(--paper); margin-bottom:12px;"><span class="brand-mark"></span>Pond &amp; Puff</a>
        <p style="color:rgba(255,253,249,0.7); font-size:0.88rem; max-width:280px; margin-top:14px;">Small-batch roasted fox nuts, sourced directly from lotus pond farms in Bihar, India.</p>
      </div>
      <div>
        <h4>Shop</h4>
        <a href="shop.html">All products</a>
        <a href="shop.html?category=classic">Classic</a>
        <a href="shop.html?category=flavored">Flavored</a>
        <a href="shop.html?category=gift-box">Gift boxes</a>
      </div>
      <div>
        <h4>Company</h4>
        <a href="about.html">About us</a>
        <a href="sourcing.html">Sourcing</a>
        <a href="profile.html">My account</a>
      </div>
      <div>
        <h4>Get in touch</h4>
        <a href="mailto:hello@pondandpuff.example">hello@pondandpuff.example</a>
        <a href="tel:+911234567890">+91 12345 67890</a>
      </div>
    </div>
    <div class="footer-bottom">© ${new Date().getFullYear()} Pond &amp; Puff. All rights reserved.</div>
  `;
});
