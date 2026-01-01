import React, { useState } from 'react';
import { TrendingUp, Database, BarChart3, Package, Menu, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/auth');
  };

  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-flex">
            <div className="logo-section">
              <div className="logo-icon">
                <TrendingUp size={28} />
              </div>
              <div className="logo-text">
                <h1 className="logo-title">DFS</h1>
                <p className="logo-subtitle">Demand Forecasting System</p>
              </div>
            </div>

            <div className="desktop-menu">
              <a href="#features" className="nav-link">Features</a>
              <a href="#about" className="nav-link">About</a>
              <button onClick={handleLoginClick} className="login-btn">
                Login
              </button>
            </div>

            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="mobile-menu-btn"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {isMenuOpen && (
            <div className="mobile-menu">
              <a href="#features" className="mobile-link">Features</a>
              <a href="#about" className="mobile-link">About</a>
              <button onClick={handleLoginClick} className="mobile-login-btn">
                Login
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-decoration hero-decoration-1"></div>
        <div className="hero-decoration hero-decoration-2"></div>

        <div className="hero-content">
          <div className="hero-center">
            <div className="hero-badge">
              <TrendingUp size={18} />
              <span>AI-Powered Demand Forecasting</span>
            </div>
            
            <h1 className="hero-title">
              Turn Sales History
              <br />
              <span className="hero-title-gradient">
                Into Future Insights
              </span>
            </h1>
            
            <p className="hero-description">
              Leverage Prophet machine learning to analyze your historical sales data and generate accurate demand forecasts for smarter inventory decisions.
            </p>
            
            <button onClick={handleLoginClick} className="hero-cta-btn">
              Click Here to Login <ArrowRight size={22} />
            </button>

            <div className="hero-stats">
              <div className="stat-card">
                <p className="stat-value">94%+</p>
                <p className="stat-label">Forecast Accuracy</p>
              </div>
              <div className="stat-card">
                <p className="stat-value">Prophet</p>
                <p className="stat-label">ML Algorithm</p>
              </div>
              <div className="stat-card">
                <p className="stat-value">Real-time</p>
                <p className="stat-label">Data Analysis</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-content">
          <div className="section-header">
            <h2 className="section-title">Core Features</h2>
            <p className="section-subtitle">
              Everything you need for accurate demand forecasting
            </p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: Database,
                title: "Data Ingestion",
                description: "Upload and validate your historical sales data in CSV format with automated quality checks and preprocessing"
              },
              {
                icon: BarChart3,
                title: "Interactive Dashboards",
                description: "Visualize demand trends, forecast accuracy, and key metrics through intuitive charts and real-time analytics"
              },
              {
                icon: Package,
                title: "Inventory Optimization",
                description: "Get automated reorder point calculations and low-stock alerts to maintain optimal inventory levels"
              }
            ].map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  <feature.icon size={32} />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About DFS Section */}
      <section id="about" className="about-section">
        <div className="about-content">
          <div className="about-card">
            <h2 className="about-title">About DFS</h2>
            
            <div className="about-text">
              <p>
                The <strong>Demand Forecasting System (DFS)</strong> is an AI-powered predictive analytics platform designed to help organizations anticipate future product demand with improved accuracy.
              </p>
              
              <div className="about-highlight">
                <h3 className="highlight-title">What We Do</h3>
                <p>
                  We analyze your <strong>historical sales data</strong> using advanced machine learning algorithms (Prophet) to generate accurate demand forecasts. This helps you make data-driven decisions about inventory management, production planning, and resource allocation.
                </p>
              </div>

              <p>
                By leveraging <strong>Prophet time-series models</strong>, DFS processes your CSV files containing historical sales information and produces:
              </p>

              <ul className="about-list">
                <li>
                  <div className="list-dot"></div>
                  <span><strong>Accurate forecasts</strong> with 94%+ accuracy for future demand periods</span>
                </li>
                <li>
                  <div className="list-dot"></div>
                  <span><strong>Trend analysis</strong> showing whether demand is increasing, decreasing, or stable</span>
                </li>
                <li>
                  <div className="list-dot"></div>
                  <span><strong>Visual dashboards</strong> with charts and key performance indicators</span>
                </li>
                <li>
                  <div className="list-dot"></div>
                  <span><strong>Inventory recommendations</strong> to optimize stock levels and reduce costs</span>
                </li>
              </ul>
              <div className="about-goal">
                <h3 className="goal-title">Our Goal</h3>
                <p>
                  Enable businesses to reduce stockouts, minimize excess inventory, and improve supply chain efficiency through intelligent, data-driven demand forecasting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Start Forecasting?</h2>
          <p className="cta-description">
            Upload your historical sales data and let our AI-powered system generate accurate demand forecasts in minutes.
          </p>
          <button onClick={handleLoginClick} className="cta-btn">
            Click Here to Login <ArrowRight size={24} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="footer-icon">
              <TrendingUp size={24} />
            </div>
            <div>
              <h3 className="footer-title">DFS</h3>
              <p className="footer-subtitle">Demand Forecasting System</p>
            </div>
          </div>
          
          <p className="footer-copyright">
            © 2025 DFS. Powered by Prophet Machine Learning.
          </p>
        </div>
      </footer>
    </div>
  );
}