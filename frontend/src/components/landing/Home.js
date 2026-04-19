import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import bikeImage2 from '../../images/bike img 2.png';
import bikeImage3 from '../../images/bike img 3.png';
import '../css/Home.css';

const Home = () => {
  const { user } = useAuth();

  // Hero images carousel - 3 different motorbike images from Unsplash
  const heroImages = [
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1627366197691-e0d5cee520bd?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1623999691691-c3753224836e?q=80&w=1135&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  ];

  const [currentHeroImage, setCurrentHeroImage] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Preload hero images
  useEffect(() => {
    const imagePromises = heroImages.map((src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
      });
    });

    Promise.all(imagePromises)
      .then(() => setImagesLoaded(true))
      .catch((err) => console.error('Error loading images:', err));
  }, []);

  useEffect(() => {
    if (!imagesLoaded) return;
    
    const interval = setInterval(() => {
      setCurrentHeroImage((prev) => (prev + 1) % heroImages.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [heroImages.length, imagesLoaded]);

  return (
    <div className="home-new">
      {/* Hero Section */}
      <section className="hero-section">
        {heroImages.map((img, index) => (
          <div
            key={index}
            className={`hero-bg-image ${index === currentHeroImage ? 'active' : ''}`}
            style={{
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        ))}
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">We Are Qualified & Professional</h1>
            <p className="hero-subtitle">FindMech - Your trusted platform for fast, transparent, and professional bike repair assistance. Connect with verified nearby mechanics in real-time.</p>
            <div className="hero-buttons">
              <Link to="/mechanics" className="btn btn-primary-red">
                Find a Mechanic Now
              </Link>
              <Link to="/register" className="btn btn-secondary-white">
                <span className="play-icon">▶</span> How We Works
              </Link>
            </div>
          </div>
        </div>
        <div className="slider-controls">
          <div className="slider-dots">
            {heroImages.map((_, index) => (
              <span 
                key={index}
                className={`dot ${index === currentHeroImage ? 'active' : ''}`}
                onClick={() => setCurrentHeroImage(index)}
              ></span>
            ))}
          </div>
        </div>
      </section>

      {/* Two Dark Panels */}
      <section className="promo-panels">
        <div className="promo-panel">
          <h3>Satisfaction Guaranteed Or Your Money Back</h3>
        </div>
        <div className="promo-panel">
          <h3>Caring For Your Bike The Way You Would</h3>
        </div>
      </section>

      {/* Experience Section */}
      <section className="experience-section">
        <div className="container">
          <div className="experience-content">
            <div className="experience-text">
              <h2>About FindMech</h2>
              <p>
                FindMech is a smart web-based platform designed to connect bike owners with verified nearby mechanics in real-time. 
                It addresses the common challenge of finding reliable and available mechanics, especially in unfamiliar areas or emergency situations.
              </p>
              <p>
                The system enables users to search for available mechanics based on their live location, view their estimated time of arrival (ETA), 
                and book either on-site assistance or scheduled repair services. Mechanics can manage their availability, accept or reject booking requests, 
                and update their live location while traveling to the customer's destination.
              </p>
              <Link to="/mechanics" className="btn btn-primary-red">
                Find Mechanics Now
              </Link>
            </div>
            <div className="experience-image">
              <img 
                src={bikeImage2}
                alt="Bike repair service"
                className="experience-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="services-section">
        <div className="container">
          <h2 className="section-title">Key Features</h2>
          <p className="section-subtitle">Everything you need for reliable bike repair assistance</p>
          <div className="services-grid">
            <div className="service-item">
              <div className="service-image">
                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Real-Time Location Tracking" />
              </div>
              <h3>Real-Time Location Tracking</h3>
              <p>Search for available mechanics based on your live location with GPS tracking</p>
            </div>
            <div className="service-item">
              <div className="service-image">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Live ETA Updates" />
              </div>
              <h3>Live ETA Updates</h3>
              <p>View estimated time of arrival and track mechanic's location in real-time</p>
            </div>
            <div className="service-item">
              <div className="service-image">
                <img src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Easy Booking System" />
              </div>
              <h3>Easy Booking System</h3>
              <p>Book on-site assistance or schedule repair services with instant notifications</p>
            </div>
            <div className="service-item">
              <div className="service-image">
                <img src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Verified Mechanics" />
              </div>
              <h3>Verified Mechanics</h3>
              <p>View mechanic profiles with certifications, reviews, ratings, and bike brand capabilities</p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="stats-section">
        <div className="container">
          <h2 className="section-title">Why Choose FindMech?</h2>
          <p className="section-subtitle">Transparency and trust at every step</p>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Available Mechanics</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Verified Professionals</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">Real-Time</div>
              <div className="stat-label">Live ETA Tracking</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">Instant</div>
              <div className="stat-label">Booking System</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" style={{
        backgroundImage: `url(${bikeImage3})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="cta-overlay"></div>
        <div className="container">
          <div className="cta-content">
            <h2>Transparent & Reliable Bike Repair Service</h2>
            <p>View mechanic profiles with certifications, reviews, ratings, and the number of customers served. Make informed decisions with verified professionals.</p>
            <div className="cta-buttons">
              <Link to="/mechanics" className="btn btn-primary-red">
                Our Services
              </Link>
              <Link to="/register" className="btn btn-secondary-white">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <h2 className="section-title">100% Approved By Customers</h2>
          <p className="section-subtitle">See what bike owners say about FindMech</p>
          <div className="testimonial-card">
            <div className="testimonial-content">
              <p className="testimonial-text">
                "FindMech saved me during a bike breakdown emergency. I found a verified mechanic within minutes based on my location, 
                tracked their live ETA, and got professional service. The transparency of seeing reviews and bike brand capabilities helped me make the right choice. Highly recommended!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Customer" />
                </div>
                <div className="author-info">
                  <h4>John Doe</h4>
                  <p>Verified Customer</p>
                </div>
              </div>
            </div>
            <div className="testimonial-dots">
              <span className="dot active"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="home-footer-new">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>Newsletter</h3>
              <p>Subscribe to get updates and special offers</p>
              <div className="newsletter-form">
                <input type="email" placeholder="Enter your email" />
                <button className="btn btn-primary-red">Subscribe</button>
              </div>
            </div>
            <div className="footer-section">
              <h3>Our Services</h3>
              <ul className="footer-links">
                <li><Link to="/mechanics">Real-Time Location Search</Link></li>
                <li><Link to="/mechanics">Live ETA Tracking</Link></li>
                <li><Link to="/mechanics">On-Site Assistance</Link></li>
                <li><Link to="/mechanics">Scheduled Repair Services</Link></li>
                <li><Link to="/mechanics">Verified Mechanic Profiles</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Contact Info</h3>
              <ul className="footer-contact">
                <li><i className="fas fa-phone"></i> +1 (555) 123-4567</li>
                <li><i className="fas fa-envelope"></i> support@findmech.com</li>
                <li><i className="fas fa-map-marker-alt"></i> 123 Service Street, City, State 12345</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 FindMech. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
