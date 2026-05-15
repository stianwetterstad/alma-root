(function () {
  const measurementId = window.ALMA_GA4_MEASUREMENT_ID;

  if (!measurementId || typeof measurementId !== 'string') {
    return;
  }

  const normalizedId = measurementId.trim();
  if (!/^G-[A-Z0-9]+$/i.test(normalizedId)) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }

  window.gtag = window.gtag || gtag;
  gtag('js', new Date());
  gtag('config', normalizedId, {
    anonymize_ip: true,
    transport_type: 'beacon'
  });

  // Optional helper for custom events, e.g. almaTrack('game_start', { game: 'snake' })
  window.almaTrack = function (eventName, params) {
    if (!eventName || typeof eventName !== 'string') {
      return;
    }
    gtag('event', eventName, params || {});
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(normalizedId);
  document.head.appendChild(script);
})();
