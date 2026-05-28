(function () {
  const emailValue = "kuznetsouad@gmail.com";
  const feedbackTimers = new WeakMap();

  const getLang = () => {
    const lang = (document.documentElement.lang || "").toLowerCase();

    if (lang.startsWith("en") || window.location.pathname.toLowerCase().includes("-en")) {
      return "en";
    }

    return "ru";
  };

  const getFeedbackText = () => getLang() === "en" ? "Copied" : "Скопировано";

  const fallbackCopy = (value) => {
    const textarea = document.createElement("textarea");
    const selection = window.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    let copied = false;

    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }

    document.body.removeChild(textarea);

    if (selection) {
      selection.removeAllRanges();

      if (savedRange) {
        selection.addRange(savedRange);
      }
    }

    return copied;
  };

  const copyEmail = async () => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(emailValue);
        return true;
      } catch (error) {
        return fallbackCopy(emailValue);
      }
    }

    return fallbackCopy(emailValue);
  };

  const showFeedback = (link) => {
    let feedback = link.querySelector(".header-link__copy-feedback");
    const currentTimer = feedbackTimers.get(link);

    if (!feedback) {
      feedback = document.createElement("span");
      feedback.className = "header-link__copy-feedback";
      feedback.setAttribute("aria-hidden", "true");
      link.appendChild(feedback);
    }

    feedback.textContent = getFeedbackText();
    link.classList.add("is-copied");

    if (currentTimer) {
      window.clearTimeout(currentTimer);
    }

    feedbackTimers.set(link, window.setTimeout(() => {
      link.classList.remove("is-copied");
      feedbackTimers.delete(link);
    }, 1600));
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[aria-label="Email"]');

    if (!link) {
      return;
    }

    event.preventDefault();

    const href = link.href;

    copyEmail().then((copied) => {
      if (copied) {
        showFeedback(link);
      }

      window.setTimeout(() => {
        window.location.href = href;
      }, copied ? 120 : 0);
    });
  });
}());
