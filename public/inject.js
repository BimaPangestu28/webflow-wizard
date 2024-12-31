(function() {
    window.__webflowWizard = {
      getElementInfo: function(element) {
        return {
          tag: element.tagName,
          id: element.id,
          classes: Array.from(element.classList),
          attributes: Array.from(element.attributes).map(attr => ({
            name: attr.name,
            value: attr.value
          }))
        };
      },
      
      generateSelector: function(element) {
        let selector = '';
        
        if (element.id) {
          selector = `#${element.id}`;
        } else if (element.className) {
          selector = `.${element.className.split(' ').join('.')}`;
        } else {
          let path = [];
          let currentElement = element;
          
          while (currentElement.nodeType === Node.ELEMENT_NODE) {
            let selector = currentElement.nodeName.toLowerCase();
            let siblings = Array.from(currentElement.parentNode.children)
              .filter(e => e.nodeName === currentElement.nodeName);
              
            if (siblings.length > 1) {
              let index = siblings.indexOf(currentElement) + 1;
              selector += `:nth-child(${index})`;
            }
            
            path.unshift(selector);
            currentElement = currentElement.parentNode;
          }
          
          selector = path.join(' > ');
        }
        
        return selector;
      },
      
      highlight: function(element) {
        const oldOutline = element.style.outline;
        const oldPosition = element.style.position;
        
        element.style.outline = '2px solid #ff0000';
        element.style.position = 'relative';
        
        setTimeout(() => {
          element.style.outline = oldOutline;
          element.style.position = oldPosition;
        }, 1000);
      }
    };
    
    window.addEventListener('message', function(event) {
      if (event.source !== window) return;
      
      if (event.data.type && event.data.type === 'FROM_CONTENT_SCRIPT') {
        const response = handleContentScriptMessage(event.data);
        window.postMessage({ type: 'FROM_PAGE', response }, '*');
      }
    });
    
    function handleContentScriptMessage(message) {
      switch (message.action) {
        case 'GET_ELEMENT_INFO':
          const element = document.querySelector(message.selector);
          return element ? window.__webflowWizard.getElementInfo(element) : null;
          
        case 'GENERATE_SELECTOR':
          return window.__webflowWizard.generateSelector(message.element);
          
        case 'HIGHLIGHT_ELEMENT':
          const targetElement = document.querySelector(message.selector);
          if (targetElement) {
            window.__webflowWizard.highlight(targetElement);
            return true;
          }
          return false;
          
        default:
          return { error: 'Unknown action' };
      }
    }
  })();