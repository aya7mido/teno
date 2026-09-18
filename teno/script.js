(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && !reduceMotion){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.18 });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ---------- Lineup: continuous left-flowing marquee ---------- */
  var track = document.getElementById('lineupTrack');
  var countEl = document.getElementById('lineupCount');
  var prevBtn = document.getElementById('prevBtn');
  var nextBtn = document.getElementById('nextBtn');
  var originalItems = Array.prototype.slice.call(track.querySelectorAll('.lineup-item'));
  var total = originalItems.length;

  function pad(n){ return n < 10 ? '0' + n : '' + n; }

  // Duplicate the set once so the track can loop seamlessly (skipped under
  // reduced-motion, where the list stays static and finite).
  var items = originalItems;
  if(!reduceMotion){
    originalItems.forEach(function(el){
      track.appendChild(el.cloneNode(true));
    });
    items = Array.prototype.slice.call(track.querySelectorAll('.lineup-item'));
  }

  function currentIndex(){
    var trackRect = track.getBoundingClientRect();
    var center = trackRect.left + trackRect.width / 2;
    var closest = 0, minDist = Infinity;
    items.forEach(function(it, i){
      var r = it.getBoundingClientRect();
      var itemCenter = r.left + r.width / 2;
      var dist = Math.abs(itemCenter - center);
      if(dist < minDist){ minDist = dist; closest = i; }
    });
    return closest;
  }

  function setActiveByIndex(idx){
    items.forEach(function(it, i){
      it.classList.toggle('active', i === idx);
    });
    var displayIdx = idx % total;
    countEl.textContent = pad(displayIdx + 1) + ' / ' + pad(total);
    if(reduceMotion){
      prevBtn.disabled = idx === 0;
      nextBtn.disabled = idx === total - 1;
    }
  }

  function refreshActive(){ setActiveByIndex(currentIndex()); }

  if(reduceMotion){
    // Static fallback: same discrete prev/next behaviour as before.
    var scrollTimer = null;
    track.addEventListener('scroll', function(){
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(refreshActive, 60);
    }, { passive: true });

    function scrollToIndex(idx){
      idx = Math.max(0, Math.min(total - 1, idx));
      var target = items[idx];
      var offset = target.offsetLeft - (track.clientWidth - target.clientWidth) / 2;
      track.scrollTo({ left: offset, behavior: 'auto' });
    }
    prevBtn.addEventListener('click', function(){ scrollToIndex(currentIndex() - 1); });
    nextBtn.addEventListener('click', function(){ scrollToIndex(currentIndex() + 1); });
    setActiveByIndex(0);
  } else {
    // Continuous auto-scroll: the track drifts left on its own, wrapping
    // seamlessly at the halfway point (where the clone set begins).
    var SPEED = 32; // px per second — slow, ambient drift
    var paused = false;
    var resumeTimer = null;
    var lastTs = null;
    var halfWidth = track.scrollWidth / 2;

    function step(ts){
      if(lastTs === null) lastTs = ts;
      var dt = ts - lastTs;
      lastTs = ts;

      if(!paused){
        track.scrollLeft += (SPEED * dt) / 1000;
        if(track.scrollLeft >= halfWidth){
          track.scrollLeft -= halfWidth;
        }
        refreshActive();
      }
      requestAnimationFrame(step);
    }

    function pause(){
      paused = true;
      clearTimeout(resumeTimer);
    }
    function scheduleResume(delay){
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function(){
        paused = false;
        lastTs = null;
      }, delay);
    }

    // Pause only for an actual grab/drag or wheel scroll — hovering alone
    // should not stop the drift (that's handled purely via CSS now).
    track.addEventListener('pointerdown', pause, { passive: true });
    track.addEventListener('pointerup', function(){ scheduleResume(1200); }, { passive: true });
    track.addEventListener('pointercancel', function(){ scheduleResume(1200); }, { passive: true });
    track.addEventListener('wheel', function(){ pause(); scheduleResume(1500); }, { passive: true });

    function nudge(dir){
      pause();
      var stepWidth = (items[0].getBoundingClientRect().width + 34); // item + gap
      track.scrollBy({ left: dir * stepWidth, behavior: 'smooth' });
      scheduleResume(1500);
    }
    prevBtn.addEventListener('click', function(){ nudge(-1); });
    nextBtn.addEventListener('click', function(){ nudge(1); });

    // Keep the wrap point accurate if fonts/images finish loading late.
    window.addEventListener('resize', function(){ halfWidth = track.scrollWidth / 2; });
    window.addEventListener('load', function(){ halfWidth = track.scrollWidth / 2; });

    setActiveByIndex(0);
    requestAnimationFrame(step);
  }
})();