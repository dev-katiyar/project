/** Smooth scroll on top of the page. */
export const scrollToTop = () => {
  (function smoothscroll(): void {
    const currentScroll = document.documentElement.scrollTop || document.body.scrollTop;
    if (currentScroll > 0) {
      window.requestAnimationFrame(smoothscroll);
      window.scrollTo(0, currentScroll - currentScroll / 8);
    }
  })();
};
