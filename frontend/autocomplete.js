/**
 * Autocomplete/Auto-Suggestion System
 * Provides real-time suggestions for form fields based on master data
 */

// Store suggestions cache to reduce server calls
let suggestionsCache = {
    customers: [],
    items: [],
    sizes: [],
    colours: [],
    itemCodes: []
};

// Initialize autocomplete listeners
function initializeAutocomplete() {
    // New Work Order form fields
    if (document.getElementById('name')) {
        document.getElementById('name').addEventListener('input', () => {
            const suggestions = suggestionsCache.customers.map(c => c.customer_name);
            updateSelectSuggestions('name', suggestions);
        });
    }
    
    if (document.getElementById('item_code')) {
        document.getElementById('item_code').addEventListener('input', () => {
            const suggestions = suggestionsCache.itemCodes.map(c => c.item_code);
            updateInputSuggestions('item_code', suggestions);
        });
    }
    
    if (document.getElementById('colour')) {
        document.getElementById('colour').addEventListener('input', () => {
            const suggestions = suggestionsCache.colours.map(c => c.colour);
            updateInputSuggestions('colour', suggestions);
        });
    }

    // Products section fields
    if (document.getElementById('item')) {
        document.getElementById('item').addEventListener('input', () => {
            const suggestions = suggestionsCache.items.map(i => i.item);
            updateSelectSuggestions('item', suggestions);
        });
    }
    
    if (document.getElementById('size')) {
        document.getElementById('size').addEventListener('input', () => {
            const suggestions = suggestionsCache.sizes.map(s => s.size);
            updateSelectSuggestions('size', suggestions);
        });
    }

    // Master Data inputs if they exist
    if (document.getElementById('new_customer_option')) {
        document.getElementById('new_customer_option').addEventListener('input', () => {
            const suggestions = suggestionsCache.customers.map(c => c.customer_name);
            updateInputSuggestions('new_customer_option', suggestions);
        });
    }
    
    if (document.getElementById('new_item_option')) {
        document.getElementById('new_item_option').addEventListener('input', () => {
            const suggestions = suggestionsCache.items.map(i => i.item);
            updateInputSuggestions('new_item_option', suggestions);
        });
    }
    
    if (document.getElementById('new_size_option')) {
        document.getElementById('new_size_option').addEventListener('input', () => {
            const suggestions = suggestionsCache.sizes.map(s => s.size);
            updateInputSuggestions('new_size_option', suggestions);
        });
    }
}

// Load all master data suggestions
function loadAutocompleteSuggestions() {
    fetch('backend/get_autocomplete.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Store all suggestions in cache
                suggestionsCache.customers = data.data.customers || [];
                suggestionsCache.items = data.data.items || [];
                suggestionsCache.sizes = data.data.sizes || [];
                suggestionsCache.colours = data.data.colours || [];
                suggestionsCache.itemCodes = data.data.itemCodes || [];
                
                // Initialize listeners after cache is populated
                initializeAutocomplete();
            }
        })
        .catch(error => console.log('Auto-suggestion load failed:', error));
}

// Update suggestions for text input fields with datalist
function updateInputSuggestions(fieldId, suggestions) {
    const field = document.getElementById(fieldId);
    if (!field || !field.value) {
        hideSuggestionsList(fieldId);
        return;
    }

    const filteredSuggestions = suggestions.filter(item => {
        const itemText = typeof item === 'string' ? item : (item.name || '');
        return itemText.toLowerCase().includes(field.value.toLowerCase());
    });

    if (filteredSuggestions.length > 0) {
        showSuggestionsList(fieldId, filteredSuggestions);
    } else {
        hideSuggestionsList(fieldId);
    }
}

// Update suggestions for select/dropdown fields
function updateSelectSuggestions(fieldId, suggestions) {
    const field = document.getElementById(fieldId);
    if (!field || !field.value) return;

    const filteredSuggestions = suggestions.filter(item => {
        const itemText = typeof item === 'string' ? item : '';
        return itemText.toLowerCase().includes(field.value.toLowerCase());
    });

    // Update the select options
    const options = field.querySelectorAll('option');
    options.forEach((option, index) => {
        if (index === 0) return; // Keep the first option
        option.remove();
    });

    filteredSuggestions.forEach(item => {
        const option = document.createElement('option');
        option.value = typeof item === 'string' ? item : '';
        option.textContent = typeof item === 'string' ? item : '';
        field.appendChild(option);
    });
}

// Show suggestions dropdown for text inputs
function showSuggestionsList(fieldId, suggestions) {
    let suggestionsList = document.getElementById(`suggestions-${fieldId}`);
    
    if (!suggestionsList) {
        const field = document.getElementById(fieldId);
        suggestionsList = document.createElement('div');
        suggestionsList.id = `suggestions-${fieldId}`;
        suggestionsList.className = 'suggestions-list';
        field.parentElement.style.position = 'relative';
        field.parentElement.appendChild(suggestionsList);
    }

    suggestionsList.innerHTML = '';
    const limitedSuggestions = suggestions.slice(0, 8); // Show max 8 suggestions

    limitedSuggestions.forEach(item => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        const text = typeof item === 'string' ? item : (item.name || item);
        suggestionItem.textContent = text;
        
        suggestionItem.addEventListener('click', () => {
            const field = document.getElementById(fieldId);
            field.value = text;
            hideSuggestionsList(fieldId);
            
            // Trigger change event for any dependent fields
            field.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        suggestionsList.appendChild(suggestionItem);
    });

    suggestionsList.style.display = 'block';
}

// Hide suggestions dropdown
function hideSuggestionsList(fieldId) {
    const suggestionsList = document.getElementById(`suggestions-${fieldId}`);
    if (suggestionsList) {
        suggestionsList.style.display = 'none';
    }
}

// Close all suggestion lists when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.matches('input[type="text"], select, textarea')) {
        document.querySelectorAll('.suggestions-list').forEach(list => {
            list.style.display = 'none';
        });
    }
});

// Load suggestions on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadAutocompleteSuggestions();
    }, 500);
});
