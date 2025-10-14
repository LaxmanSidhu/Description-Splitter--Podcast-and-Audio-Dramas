document.addEventListener("DOMContentLoaded", function () {
  // Home page animations and interactions
  initHomePageAnimations();
  
  const buttons = document.querySelectorAll(".option-btn");
  const textarea = document.getElementById("user_input");
  const resultsWrapper = document.getElementById("results");
  const resultsContainer = document.getElementById("resultsContainer");
  const aiResultsContainer = document.getElementById("aiResultsContainer");
  const savedSection = document.getElementById("savedQueriesSection");
  const savedList = document.getElementById("saved-list");
  const savedPlaceholder = document.getElementById("saved-placeholder");
  const toggleAIButton = document.getElementById("toggleAISuggestions");

  // Determine mode from a hidden input or data attribute
  let mode = (document.body.getAttribute("data-mode") || "").trim() || (window.location.pathname.includes("audio") ? "audio dramas" : "podcasts");

  // Non-persistent saved queries (cleared on refresh)
  const storageKey = null;
  let savedQueries = [];

  function showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "alert alert-success position-fixed top-0 end-0 m-3";
    notification.style.zIndex = 9999;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }

  function renderResults(queries) {
    resultsContainer.innerHTML = "";
    if (!queries || queries.length === 0) {
      resultsContainer.innerHTML = "<div class='text-muted'>No results</div>";
      return;
    }
    resultsWrapper?.classList?.remove("d-none");
    queries.forEach((query) => {
      const card = document.createElement("div");
      card.className = "query-box";
      card.innerHTML = `
        <button class="save-btn" onclick="saveQuery('${query.replace(/'/g, "\\'")}', this)">Save</button>
        <button class="copy-btn" onclick="copyQuery('${query.replace(/'/g, "\\'")}')">📋</button>
        <div class="query-content">${query}</div>
      `;
      resultsContainer.appendChild(card);
    });
  }

  async function fetchResults(option) {
    const text = textarea.value || "";
    const resp = await fetch("/generate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({text, option, mode})
    });
    const data = await resp.json();
    return data.result || [];
  }

  async function fetchAISuggestions() {
    const text = textarea.value || "";
    const resp = await fetch("/ai_suggestions", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({text, mode})
    });
    const data = await resp.json();
    return data.suggestions || [];
  }

  // Validate textarea is required
  function ensureTextPresent() {
    const hasText = (textarea.value || '').trim().length > 0;
    if (!hasText) {
      textarea.classList.add('is-invalid');
      showNotification('Please enter text');
    }
    return hasText;
  }

  textarea?.addEventListener('input', () => {
    if ((textarea.value || '').trim().length > 0) {
      textarea.classList.remove('is-invalid');
    }
  });

  // Handle option button clicks + active highlighting
  buttons.forEach(btn => {
    btn.addEventListener("click", async function () {
      if (!ensureTextPresent()) return;
      const option = this.dataset.option;
      buttons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      resultsContainer.innerHTML = "<div class='text-muted'>Generating…</div>";
      const res = await fetchResults(option);
      renderResults(res);
    });
  });

  // Copy and save functions accessible globally
  window.copyQuery = function (q) {
    navigator.clipboard?.writeText(q).then(()=> showNotification("Copied to clipboard")).catch(()=> showNotification("Copy failed"));
  };

  window.saveQuery = function (q, btnEl) {
    if (!savedQueries.includes(q)) {
      savedQueries.push(q);
      // no persistence
      renderSaved();
      showNotification("Saved");
      if (btnEl) btnEl.textContent = "Saved";
    } else {
      showNotification("Already saved");
    }
  };

  // remove saved query
  window.removeSaved = function (q) {
    savedQueries = savedQueries.filter(x=> x !== q);
    // no persistence
    renderSaved();
    showNotification("Removed");
  };

  function renderSaved() {
    savedList.innerHTML = "";
    if (savedQueries.length === 0) {
      savedPlaceholder.style.display = "block";
      return;
    }
    savedPlaceholder.style.display = "none";
    savedQueries.forEach(s => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `<div class="small">${s}</div>
        <div>
          <button class="btn btn-sm btn-outline-secondary me-1" onclick="copyQuery('${s.replace(/'/g, "\\'")}')">📋</button>
          <button class="btn btn-sm btn-danger" onclick="removeSaved('${s.replace(/'/g, "\\'")}')">Remove</button>
        </div>`;
      savedList.appendChild(li);
    });
  }

  // AI Suggestions toggle with proper collapse events and dummy content
  if (toggleAIButton) {
    const collapseEl = document.getElementById("aiSuggestions");
    collapseEl?.addEventListener('show.bs.collapse', async () => {
      toggleAIButton.textContent = 'Hide AI Suggestions';
      const container = document.getElementById('aiResultsContainer');
      const DUMMY_BASE = ['true crime', 'daily news', 'tech trends', 'history bites', 'mindfulness', 'startup stories'];
      const suffix = mode === 'audio dramas' ? 'audio dramas' : 'podcasts';
      const suggestions = DUMMY_BASE.flatMap(b => [b, `${b} ${suffix}`]).slice(0, 12);
      container.innerHTML = '';
      suggestions.forEach((s) => {
        const div = document.createElement('div');
        div.className = 'ai-suggestion p-2 mb-2 border rounded';
        div.innerHTML = `<div class=\"d-flex justify-content-between align-items-center\">`
          + `<div class=\"ai-text\">${s}</div>`
          + `<div class=\"ai-actions\">`
          + `<button class=\"btn btn-sm btn-outline-secondary me-1\" onclick=\"copyQuery('${s.replace(/'/g, "\\'")}')\">📋</button>`
          + `<button class=\"btn btn-sm btn-primary\" onclick=\"saveQuery('${s.replace(/'/g, "\\'")}', this)\">Save</button>`
          + `</div></div>`;
        container.appendChild(div);
      });
    });
    collapseEl?.addEventListener('hide.bs.collapse', () => {
      toggleAIButton.textContent = 'Show AI Suggestions';
    });
  }

  // initialize saved (also attempt to clear any old persisted keys)
  renderSaved();
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('savedQueries:')) localStorage.removeItem(k);
    });
  } catch (e) {}

  // If page has a button to generate default on load, you can trigger here if desired

});

// Home page animations and interactions
function initHomePageAnimations() {
  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, observerOptions);

  // Observe elements for scroll animations
  const animatedElements = document.querySelectorAll('.feature-card, .feature-item, .hero-content');
  animatedElements.forEach(el => {
    observer.observe(el);
  });

  // Add hover effects to feature cards
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-12px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });

  // Add click ripple effect to cards
  featureCards.forEach(card => {
    card.addEventListener('click', function(e) {
      const ripple = document.createElement('div');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        z-index: 10;
      `;
      
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  // Add CSS for ripple animation
  if (!document.querySelector('#ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'ripple-styles';
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      .animate-in {
        animation: fadeInUp 0.8s ease-out forwards;
      }
      
      .feature-card {
        opacity: 0;
        transform: translateY(30px);
      }
      
      .feature-card.animate-in {
        opacity: 1;
        transform: translateY(0);
      }
      
      .feature-item {
        opacity: 0;
        transform: translateY(20px);
      }
      
      .feature-item.animate-in {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }

  // Parallax effect for hero shapes
  const heroShapes = document.querySelectorAll('.shape');
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * -0.5;
    
    heroShapes.forEach((shape, index) => {
      const speed = 0.5 + (index * 0.1);
      shape.style.transform = `translateY(${rate * speed}px) rotate(${scrolled * 0.1}deg)`;
    });
  });

  // Add typing effect to hero title
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    const text = heroTitle.textContent;
    heroTitle.textContent = '';
    heroTitle.style.opacity = '1';
    
    let i = 0;
    const typeWriter = () => {
      if (i < text.length) {
        heroTitle.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, 50);
      }
    };
    
    // Start typing effect after a short delay
    setTimeout(typeWriter, 500);
  }

  // Add counter animation to stats
  const statNumbers = document.querySelectorAll('.stat-number');
  const animateCounter = (element, target) => {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      element.textContent = Math.floor(current);
    }, 30);
  };

  // Animate stats when they come into view
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const statNumber = entry.target.querySelector('.stat-number');
        const text = statNumber.textContent;
        
        if (text === '2') {
          animateCounter(statNumber, 2);
        } else if (text === '∞') {
          statNumber.textContent = '∞';
        } else if (text === '100%') {
          animateCounter(statNumber, 100);
        }
        
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    statsObserver.observe(heroStats);
  }
}
