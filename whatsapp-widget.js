(function () {
  'use strict';

  // WhatsApp Business contact details
  var WHATSAPP_NUMBER = '390240702168';
  var WHATSAPP_URL = 'https://wa.me/' + WHATSAPP_NUMBER;

  // CSS styling that matches the site's design system
  var css = `
  #whatsapp-widget {
    position: fixed;
    bottom: 24px;
    left: 24px;
    z-index: 10001;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
    box-shadow: 0 4px 20px rgba(37, 211, 102, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    text-decoration: none;
    opacity: 0;
    transform: scale(0.8);
    animation: whatsapp-fadeIn 0.5s ease forwards 1s;
  }

  #whatsapp-widget:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 28px rgba(37, 211, 102, 0.45);
    text-decoration: none;
  }

  #whatsapp-widget svg {
    width: 28px;
    height: 28px;
    fill: #ffffff;
    transition: transform 0.3s ease;
  }

  #whatsapp-widget:hover svg {
    transform: scale(1.1);
  }

  /* Tooltip */
  #whatsapp-widget::after {
    content: 'Contattaci su WhatsApp';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-10px);
    background: var(--navy, #0D1B2A);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-family: 'Montserrat', sans-serif;
    font-weight: 500;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease, transform 0.3s ease;
    z-index: 10002;
  }

  #whatsapp-widget:hover::after {
    opacity: 1;
    transform: translateX(-50%) translateY(-5px);
  }

  /* Pulse animation for attention */
  @keyframes whatsapp-pulse {
    0% {
      box-shadow: 0 4px 20px rgba(37, 211, 102, 0.35);
    }
    50% {
      box-shadow: 0 4px 20px rgba(37, 211, 102, 0.6), 0 0 0 10px rgba(37, 211, 102, 0.1);
    }
    100% {
      box-shadow: 0 4px 20px rgba(37, 211, 102, 0.35);
    }
  }

  @keyframes whatsapp-fadeIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Add subtle pulse every few seconds */
  #whatsapp-widget.pulse {
    animation: whatsapp-pulse 2s ease-in-out;
  }

  /* Responsive adjustments */
  @media (max-width: 860px) {
    #whatsapp-widget {
      bottom: 16px;
      left: 16px;
      width: 54px;
      height: 54px;
    }
    
    #whatsapp-widget svg {
      width: 26px;
      height: 26px;
    }
    
    #whatsapp-widget::after {
      font-size: 11px;
      padding: 6px 10px;
    }
  }
  
  /* Ensure it doesn't interfere with chat widget on mobile */
  @media (max-width: 480px) {
    #whatsapp-widget {
      bottom: 96px; /* Move up when chat widget is full screen */
      left: 16px;
    }
  }
  `;

  // HTML structure
  var html = `
  <a id="whatsapp-widget" href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer" aria-label="Contatta su WhatsApp Business">
    <svg viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"/>
    </svg>
  </a>
  `;

  // Inject the widget
  function injectWhatsAppWidget() {
    // Add CSS
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Add HTML
    var div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstElementChild);

    // Add periodic pulse animation for attention
    var widget = document.getElementById('whatsapp-widget');
    if (widget) {
      // Pulse every 20 seconds to catch attention
      setInterval(function() {
        widget.classList.add('pulse');
        setTimeout(function() {
          widget.classList.remove('pulse');
        }, 2000);
      }, 20000);

      // Track clicks for analytics if available
      widget.addEventListener('click', function() {
        // Try to track with existing analytics if available
        if (window.gtag) {
          gtag('event', 'click', {
            event_category: 'WhatsApp Widget',
            event_label: 'Contact Button Click'
          });
        }
        if (window.analytics && window.analytics.track) {
          window.analytics.track('WhatsApp Contact Clicked', {
            source: 'widget',
            page: window.location.pathname
          });
        }
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWhatsAppWidget);
  } else {
    injectWhatsAppWidget();
  }
})();