import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const fallbackImage = "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1920&q=80";

function HeroSlider({ banners, loading, error }) {
  const [imageErrors, setImageErrors] = useState({});
  const swiperRef = useRef(null);

  const handleImageError = (bannerId) => {
    setImageErrors((prev) => ({ ...prev, [bannerId]: true }));
  };

  const handleCtaClick = (banner) => {
    if (!banner.link) return;
    
    switch (banner.linkType) {
      case "menu":
        window.location.href = "/menu";
        break;
      case "category":
        window.location.href = `/menu?category=${encodeURIComponent(banner.category || "")}`;
        break;
      case "custom":
        window.location.href = banner.link;
        break;
      default:
        if (banner.link) {
          window.location.href = banner.link;
        }
    }
  };

  // Skeleton Loader
  if (loading) {
    return (
      <section className="hero-slider">
        <div className="hero-slider-skeleton">
          <div className="skeleton-image"></div>
          <div className="skeleton-overlay"></div>
          <div className="skeleton-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-subtitle"></div>
            <div className="skeleton-cta"></div>
          </div>
        </div>
        <style>{`
          .hero-slider {
            position: relative;
            width: 100%;
            height: 500px;
            overflow: hidden;
          }
          .hero-slider-skeleton {
            width: 100%;
            height: 100%;
            position: relative;
          }
          .skeleton-image {
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
          .skeleton-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 100%);
          }
          .skeleton-content {
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            max-width: 800px;
            text-align: center;
          }
          .skeleton-title {
            height: 40px;
            width: 60%;
            margin: 0 auto 16px;
            background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
          }
          .skeleton-subtitle {
            height: 24px;
            width: 40%;
            margin: 0 auto 24px;
            background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
          }
          .skeleton-cta {
            height: 48px;
            width: 160px;
            margin: 0 auto;
            background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 8px;
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </section>
    );
  }

  // Error State
  if (error) {
    return (
      <section className="hero-slider">
        <div className="hero-slider-error">
          <div className="error-content">
            <h3>Unable to load banners</h3>
            <p>{error}</p>
          </div>
        </div>
        <style>{`
          .hero-slider {
            position: relative;
            width: 100%;
            height: 500px;
            overflow: hidden;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          }
          .hero-slider-error {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .error-content {
            text-align: center;
            color: #fff;
          }
          .error-content h3 {
            margin: 0 0 8px;
            font-size: 24px;
          }
          .error-content p {
            margin: 0;
            opacity: 0.7;
          }
        `}</style>
      </section>
    );
  }

  // Empty State
  if (!banners || banners.length === 0) {
    return (
      <section className="hero-slider">
        <div className="hero-slider-empty">
          <div className="empty-content">
            <h3>Special Offers Coming Soon</h3>
            <p>Check back later for exciting deals!</p>
          </div>
        </div>
        <style>{`
          .hero-slider {
            position: relative;
            width: 100%;
            height: 500px;
            overflow: hidden;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          }
          .hero-slider-empty {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .empty-content {
            text-align: center;
            color: #fff;
          }
          .empty-content h3 {
            margin: 0 0 8px;
            font-size: 32px;
          }
          .empty-content p {
            margin: 0;
            opacity: 0.7;
          }
        `}</style>
      </section>
    );
  }

  return (
    <section className="hero-slider">
      <Swiper
        ref={swiperRef}
        modules={[Navigation, Pagination, Autoplay]}
        slidesPerView={1}
        loop={banners.length > 1}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        pagination={{
          clickable: true,
          dynamicBullets: true
        }}
        navigation={banners.length > 1}
        speed={800}
        effect="fade"
        fadeEffect={{
          crossFade: true
        }}
        className="hero-slider-swiper"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner._id} className="hero-slide">
            <div className="slide-image-container">
              <img
                src={imageErrors[banner._id] ? fallbackImage : (banner.image || fallbackImage)}
                alt={banner.title || "Banner"}
                className="slide-image"
                loading="lazy"
                onError={() => handleImageError(banner._id)}
              />
              <div className="slide-overlay"></div>
            </div>
            <div className="slide-content">
              {banner.title && <p className="eyebrow">{banner.title}</p>}
              <h2>{banner.description || "Check out our latest offers!"}</h2>
              {banner.link && banner.linkType !== "none" && (
                <button 
                  className="cta-button"
                  onClick={() => handleCtaClick(banner)}
                >
                  Explore Now
                </button>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      
      <style>{`
        .hero-slider {
          position: relative;
          width: 100%;
          height: 500px;
          overflow: hidden;
        }
        
        @media (max-width: 768px) {
          .hero-slider {
            height: 400px;
          }
        }
        
        @media (max-width: 480px) {
          .hero-slider {
            height: 350px;
          }
        }
        
        .hero-slider-swiper {
          width: 100%;
          height: 100%;
        }
        
        .hero-slide {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .slide-image-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .slide-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        
        .slide-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.5) 40%,
            rgba(0, 0, 0, 0.2) 100%
          );
        }
        
        .slide-content {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 900px;
          text-align: center;
          color: #fff;
          z-index: 10;
        }
        
        @media (max-width: 768px) {
          .slide-content {
            bottom: 70px;
          }
        }
        
        @media (max-width: 480px) {
          .slide-content {
            bottom: 60px;
          }
        }
        
        .slide-content .eyebrow {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #ff6b35;
          margin: 0 0 12px;
          font-weight: 600;
        }
        
        .slide-content h2 {
          font-size: 48px;
          font-weight: 700;
          margin: 0 0 24px;
          line-height: 1.2;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        
        @media (max-width: 768px) {
          .slide-content h2 {
            font-size: 36px;
          }
        }
        
        @media (max-width: 480px) {
          .slide-content h2 {
            font-size: 28px;
            margin-bottom: 20px;
          }
        }
        
        .cta-button {
          display: inline-block;
          padding: 16px 40px;
          font-size: 16px;
          font-weight: 600;
          color: #fff;
          background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
          border: none;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 107, 53, 0.4);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 107, 53, 0.6);
        }
        
        .cta-button:active {
          transform: translateY(0);
        }
        
        @media (max-width: 480px) {
          .cta-button {
            padding: 14px 32px;
            font-size: 14px;
          }
        }
        
        /* Swiper Navigation Styles */
        :global(.hero-slider-swiper .swiper-button-next),
        :global(.hero-slider-swiper .swiper-button-prev) {
          color: #fff;
          background: rgba(0, 0, 0, 0.3);
          width: 50px;
          height: 50px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }
        
        :global(.hero-slider-swiper .swiper-button-next:hover),
        :global(.hero-slider-swiper .swiper-button-prev:hover) {
          background: rgba(255, 107, 53, 0.8);
        }
        
        :global(.hero-slider-swiper .swiper-button-next::after),
        :global(.hero-slider-swiper .swiper-button-prev::after) {
          font-size: 20px;
          font-weight: bold;
        }
        
        @media (max-width: 768px) {
          :global(.hero-slider-swiper .swiper-button-next),
          :global(.hero-slider-swiper .swiper-button-prev) {
            width: 40px;
            height: 40px;
          }
          
          :global(.hero-slider-swiper .swiper-button-next::after),
          :global(.hero-slider-swiper .swiper-button-prev::after) {
            font-size: 16px;
          }
        }
        
        /* Swiper Pagination Styles */
        :global(.hero-slider-swiper .swiper-pagination-bullet) {
          width: 12px;
          height: 12px;
          background: rgba(255, 255, 255, 0.5);
          opacity: 1;
          transition: all 0.3s ease;
        }
        
        :global(.hero-slider-swiper .swiper-pagination-bullet-active) {
          width: 30px;
          border-radius: 10px;
          background: #ff6b35;
        }
        
        :global(.hero-slider-swiper .swiper-pagination) {
          bottom: 30px;
        }
        
        @media (max-width: 480px) {
          :global(.hero-slider-swiper .swiper-pagination-bullet) {
            width: 8px;
            height: 8px;
          }
          
          :global(.hero-slider-swiper .swiper-pagination-bullet-active) {
            width: 20px;
          }
        }
      `}</style>
    </section>
  );
}

export default HeroSlider;
