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


