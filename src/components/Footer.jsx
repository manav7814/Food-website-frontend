import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3>FoodHub</h3>
          <p className="muted">Modern food ordering with trusted restaurants and fast checkout.</p>
        </div>

        <div>
          <h4>Quick Links</h4>
          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/menu">Menu</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/orders">Orders</Link>
          
            <Link to="/admin/setup">Admin Setup</Link>
            <Link to="/driver/login">Driver Login</Link>
          </div>
        </div>
        

        <div>
        <h4>Contact</h4><p className="muted flex items-center gap-10">
<svg className="w-8 h-5 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
  <path d="M2.038 5.61A2.01 2.01 0 0 0 2 6v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6c0-.12-.01-.238-.03-.352l-.866.65-7.89 6.032a2 2 0 0 1-2.429 0L2.884 6.288l-.846-.677Z"/>
  <path d="M20.677 4.117A1.996 1.996 0 0 0 20 4H4c-.225 0-.44.037-.642.105l.758.607L12 10.742 19.9 4.7l.777-.583Z"/>
</svg> 



  <span>support@foodhub.com</span>
</p>
         
  
          <p className="muted">+1 (555) 987-1234</p>
        </div>
      </div>
      <div className="container footer-bottom">(c) {year} FoodHub. All rights reserved.</div>
    </footer>
  );
}
