// Carrusel de Reseñas de Google para NISSA
(function() {
  function initReviewsCarousel() {
    const root = document.querySelector('#empretienda-google-reviews-root');
    if (!root) return;

    const container = root.querySelector('#google-reviews-carousel-track');
    const slides = root.querySelectorAll('.google-review-slide');
    const prevBtn = root.querySelector('#google-review-prev');
    const nextBtn = root.querySelector('#google-review-next');
    const dots = root.querySelectorAll('.google-review-dot');

    if (!container || slides.length === 0) return;

    let currentIndex = 0;
    const totalSlides = slides.length;
    let itemsToShow = 1;

    function updateItemsToShow() {
      if (window.innerWidth >= 1024) itemsToShow = 3;
      else if (window.innerWidth >= 768) itemsToShow = 2;
      else itemsToShow = 1;
      showSlide(currentIndex);
    }

    function showSlide(index) {
      const maxIndex = Math.max(0, totalSlides - itemsToShow);
      if (index < 0) index = 0;
      if (index > maxIndex) index = maxIndex;
      currentIndex = index;

      const gap = 16;
      const parentWidth = container.parentElement ? container.parentElement.clientWidth : 800;
      const itemWidth = (parentWidth - (gap * (itemsToShow - 1))) / itemsToShow;
      const shift = currentIndex * (itemWidth + gap);

      container.style.transform = `translateX(-${shift}px)`;

      dots.forEach((dot, idx) => {
        if (idx === currentIndex) {
          dot.style.background = '#0ea5e9';
          dot.style.opacity = '1';
        } else {
          dot.style.background = '#e2e8f0';
          dot.style.opacity = '0.5';
        }
      });

      if (prevBtn) prevBtn.style.opacity = currentIndex === 0 ? '0.4' : '1';
      if (nextBtn) nextBtn.style.opacity = currentIndex === maxIndex ? '0.4' : '1';
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) showSlide(currentIndex - 1);
        else showSlide(totalSlides - itemsToShow);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const maxIndex = totalSlides - itemsToShow;
        if (currentIndex < maxIndex) showSlide(currentIndex + 1);
        else showSlide(0);
      });
    }

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => showSlide(idx));
    });

    let intervalId = setInterval(() => {
      const maxIndex = Math.max(0, totalSlides - itemsToShow);
      if (currentIndex < maxIndex) showSlide(currentIndex + 1);
      else showSlide(0);
    }, 4500);

    container.addEventListener('mouseenter', () => clearInterval(intervalId));
    container.addEventListener('mouseleave', () => {
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        const maxIndex = Math.max(0, totalSlides - itemsToShow);
        if (currentIndex < maxIndex) showSlide(currentIndex + 1);
        else showSlide(0);
      }, 4500);
    });

    let startX = 0;
    container.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          const maxIndex = totalSlides - itemsToShow;
          if (currentIndex < maxIndex) showSlide(currentIndex + 1);
          else showSlide(0);
        } else {
          if (currentIndex > 0) showSlide(currentIndex - 1);
          else showSlide(totalSlides - itemsToShow);
        }
      }
    }, { passive: true });

    window.addEventListener('resize', updateItemsToShow);
    updateItemsToShow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReviewsCarousel);
  } else {
    initReviewsCarousel();
  }
})();
