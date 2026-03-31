<?php
// Carica stili child theme
add_action('wp_enqueue_scripts', 'kadence_child_enqueue_styles');
function kadence_child_enqueue_styles() {
    wp_enqueue_style('parent-style', get_template_directory_uri().'/style.css');
    wp_enqueue_style('child-style', get_stylesheet_uri(), array('parent-style'));
}

// CONFIGURAZIONE CENTRALIZZATA — modifica solo qui
define('AR_GA_ID',        'G-2X3V7JZPBJ');
define('AR_FB_PIXEL',     '1113993426083027');
define('AR_LI_PARTNER',   '6008396');
define('AR_IUBENDA_SITE', '89530968');

// GOOGLE ANALYTICS 4
function ar_google_analytics() {
    if ( is_admin() ) return;
    ?>
    <script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo AR_GA_ID; ?>"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '<?php echo AR_GA_ID; ?>');
    </script>
    <?php
}
add_action('wp_head', 'ar_google_analytics', 1);

// FACEBOOK PIXEL
function ar_facebook_pixel() {
    if ( is_admin() ) return;
    ?>
    <script>
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','<?php echo AR_FB_PIXEL; ?>');
      fbq('track','PageView');
    </script>
    <?php
}
add_action('wp_head', 'ar_facebook_pixel', 2);

// LINKEDIN INSIGHT
function ar_linkedin_insight() {
    if ( is_admin() ) return;
    ?>
    <script type="text/javascript">
      _linkedin_partner_id = "<?php echo AR_LI_PARTNER; ?>";
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(_linkedin_partner_id);
    </script>
    <script type="text/javascript">
      (function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};
      window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];
      var b=document.createElement("script");b.type="text/javascript";b.async=true;
      b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";
      s.parentNode.insertBefore(b,s);})(window.lintrk);
    </script>
    <?php
}
add_action('wp_head', 'ar_linkedin_insight', 3);

// IUBENDA
function ar_iubenda() {
    if ( is_admin() ) return;
    ?>
    <script type="text/javascript">
      var _iub = _iub || [];
      _iub.csConfiguration = {
        "siteId": <?php echo AR_IUBENDA_SITE; ?>,
        "cookiePolicyId": <?php echo AR_IUBENDA_SITE; ?>,
        "lang": "it",
        "storage": {"useSiteId": true},
        "banner": {
          "acceptButtonDisplay": true,
          "customizeButtonDisplay": true,
          "rejectButtonDisplay": true,
          "position": "bottom"
        }
      };
    </script>
    <script type="text/javascript"
      src="https://cs.iubenda.com/autoblocking/<?php echo AR_IUBENDA_SITE; ?>.js">
    </script>
    <script type="text/javascript"
      src="//cdn.iubenda.com/cs/iubenda_cs.js" charset="UTF-8" async>
    </script>
    <?php
}
add_action('wp_head', 'ar_iubenda', 4);

// STAGING — blocca indicizzazione Google automaticamente
function ar_noindex_staging() {
    if ( strpos( home_url(), 'staging.' ) !== false ) {
        echo '<meta name="robots" content="noindex, nofollow">' . "\n";
    }
}
add_action('wp_head', 'ar_noindex_staging', 1);

// SICUREZZA
add_filter('xmlrpc_enabled', '__return_false');
remove_action('wp_head', 'wp_generator');

// WHATSAPP BUSINESS WIDGET
function ar_whatsapp_widget() {
    if ( is_admin() ) return;
    
    $whatsapp_number = '390240702168';
    $whatsapp_url = 'https://wa.me/' . $whatsapp_number;
    ?>
    <style>
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

    #whatsapp-widget::after {
        content: 'Contattaci su WhatsApp';
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(-10px);
        background: #0D1B2A;
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

    @keyframes whatsapp-pulse {
        0% { box-shadow: 0 4px 20px rgba(37, 211, 102, 0.35); }
        50% { box-shadow: 0 4px 20px rgba(37, 211, 102, 0.6), 0 0 0 10px rgba(37, 211, 102, 0.1); }
        100% { box-shadow: 0 4px 20px rgba(37, 211, 102, 0.35); }
    }

    @keyframes whatsapp-fadeIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
    }

    #whatsapp-widget.pulse {
        animation: whatsapp-pulse 2s ease-in-out;
    }

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
    
    @media (max-width: 480px) {
        #whatsapp-widget {
            bottom: 96px;
            left: 16px;
        }
    }
    </style>
    
    <a id="whatsapp-widget" href="<?php echo $whatsapp_url; ?>" target="_blank" rel="noopener noreferrer" aria-label="Contatta su WhatsApp Business">
        <svg viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"/>
        </svg>
    </a>

    <script>
    (function() {
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
    })();
    </script>
    <?php
}
add_action('wp_footer', 'ar_whatsapp_widget');


