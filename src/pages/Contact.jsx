export default function Contact() {
  return (
    <main className="container page-gap">
      <section className="hero">
        <div>
          <p className="eyebrow">Contact us</p>
          <h1>Need help with your order or account?</h1>
          <p className="hero-copy">
            Our support team is available every day to help with order tracking, payment issues, and
            account support.
          </p>
          <div className="hero-meta">
            <span>Support: 24/7</span>
            <span>Email response: under 2 hours</span>
            <span>Phone support: 8 AM - 10 PM</span>
          </div>
        </div>

        <div className="hero-panel">
          <h3>Support Channels</h3>
          <p>
            Email: <strong>support@foodhub.com</strong>
          </p>
          <p>
            Phone: <strong>+1 (555) 987-1234</strong>
          </p>
          <p>
            Office: <strong>Ahmedabad</strong>
          </p>
        </div>
      </section>

      <section className="contact-grid">
        <article className="card">
          <div className="card-content">
            <h3>Customer Care</h3>
            <p className="muted">
              For delays, cancellations, or missing items, include your order ID in your message for
              faster resolution.
            </p>
          </div>
        </article>
        <article className="card">
          <div className="card-content">
            <h3>Business Partnerships</h3>
            <p className="muted">
              Restaurant owners can reach out for onboarding and service partnership opportunities.
            </p>
          </div>
        </article>
        <article className="card">
          <div className="card-content">
            <h3>Technical Support</h3>
            <p className="muted">
              Report website bugs, login issues, or payment errors. Include screenshots where
              possible.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
