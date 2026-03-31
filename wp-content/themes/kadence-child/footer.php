<?php
/**
 * The template for displaying the footer with unified design
 *
 * Contains the unified footer structure matching the static HTML pages
 *
 * @package kadence-child
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Hook for bottom of inner wrap.
 */
do_action( 'kadence_after_content' );
?>
	</main><!-- #inner-wrap -->
	<?php
	do_action( 'kadence_before_footer' );
	?>

<!-- Unified Footer -->
<footer class="footer unified-footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-brand">
                <img src="<?php echo esc_url(get_template_directory_uri()); ?>/../../../images/logo.png" alt="Metodo Eureka">
                <p>Dal 2001 aiutiamo professionisti, imprenditori e studenti a imparare più velocemente e ricordare di più — con un metodo provato su oltre 20.000 persone.</p>
            </div>

            <div class="footer-col">
                <h4>Il Metodo</h4>
                <a href="<?php echo esc_url(home_url('/metodo-eureka.html')); ?>">Il Metodo Eureka</a>
                <a href="<?php echo esc_url(home_url('/master-eureka.html')); ?>">Il Master Eureka</a>
                <a href="<?php echo esc_url(home_url('/tecniche-memoria.html')); ?>">Tecniche di Memoria</a>
                <a href="<?php echo esc_url(home_url('/lettura-veloce.html')); ?>">Lettura Veloce</a>
                <a href="<?php echo esc_url(home_url('/mappe-mentali.html')); ?>">Mappe Mentali</a>
            </div>

            <div class="footer-col">
                <h4>Risorse</h4>
                <a href="<?php echo esc_url(home_url('/demo-zoom/index.html')); ?>">Webinar Gratuito</a>
                <a href="<?php echo esc_url(home_url('/coaching.html')); ?>">Coaching Gratuita</a>
                <a href="<?php echo esc_url(home_url('/testimonianze.html')); ?>">Testimonianze</a>
                <a href="<?php echo esc_url(home_url('/libro.html')); ?>">Il Nostro Libro</a>
                <a href="https://academy.apprendimentorapido.it/users/sign_in" target="_blank">Login Allievi</a>
            </div>

            <div class="footer-col">
                <h4>Contatti</h4>
                <div class="footer-contact">
                    Via Gardiscia 10<br>
                    Rovio, (CH) 6821<br><br>
                    <a href="mailto:info@apprendimentorapido.it">info@apprendimentorapido.it</a>
                    <a href="tel:+390240702168">+390240702168</a><br>
                    Lun–Ven 9:00–18:30
                </div>
            </div>
        </div>

        <div class="footer-bottom">
            <p>© <?php echo date('Y'); ?> Apprendimento Rapido – Metodo Eureka. Tutti i diritti riservati.</p>
            <div>
                <a href="https://www.iubenda.com/privacy-policy/89530968" target="_blank">Privacy Policy</a>
                <a href="https://www.iubenda.com/privacy-policy/89530968/cookie-policy" target="_blank">Cookie Policy</a>
                <a href="https://www.iubenda.com/termini-e-condizioni/89530968" target="_blank">Termini e Condizioni</a>
            </div>
        </div>
    </div>
</footer>

<?php
	do_action( 'kadence_after_footer' );
?>
</div><!-- #wrapper -->
<?php do_action( 'kadence_after_wrapper' ); ?>

<?php wp_footer(); ?>
</body>
</html>