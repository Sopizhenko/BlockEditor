// Select elements
const blockContainer = document.getElementById('block-container');
const blockTypeElements = document.querySelectorAll('.block-type');
const blockOptionsPanel = document.getElementById('block-options-panel');
const blockOptionsContent = document.getElementById('block-options-content');
const editor = document.querySelector('.editor');
const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const editModeToggle = document.getElementById('edit-mode-toggle');
const editorContainer = document.querySelector('.editor-container');

let blockCount = 0; // Properly initialized block count to 0
let draggedBlockType = null; // Variable to store the type of block being dragged
let draggedBlock = null;  // Variable to store the dragged block within the editor
let selectedBlock = null; // Variable to store the currently selected block

let history = []; // Array to store the history of changes
let currentStep = -1; // Current position in history

// Attach drag event listeners to the block types in the panel
blockTypeElements.forEach((blockTypeElement) => {
    blockTypeElement.addEventListener('dragstart', handleBlockTypeDragStart);
});

// Handle the start of dragging a block type from the panel
function handleBlockTypeDragStart(event) {
    draggedBlockType = event.target.getAttribute('data-block-type');
}

// Drag and Drop event handlers for the editor area
blockContainer.addEventListener('dragover', (event) => {
    event.preventDefault(); // Allow dropping
    const afterElement = getDragAfterElement(blockContainer, event.clientY);
    const draggingIndicator = document.querySelector('.dragging-indicator');
    if (!draggingIndicator) {
        const indicator = document.createElement('div');
        indicator.classList.add('dragging-indicator');
        indicator.style.height = '3px';
        indicator.style.backgroundColor = 'green';
        blockContainer.appendChild(indicator);
    }
    if (afterElement == null) {
        blockContainer.appendChild(document.querySelector('.dragging-indicator'));
    } else {
        blockContainer.insertBefore(document.querySelector('.dragging-indicator'), afterElement);
    }
});

blockContainer.addEventListener('dragleave', () => {
    const draggingIndicator = document.querySelector('.dragging-indicator');
    if (draggingIndicator) {
        draggingIndicator.remove();
    }
});

blockContainer.addEventListener('drop', (event) => {
    event.preventDefault(); // Prevent default behavior
    const draggingIndicator = document.querySelector('.dragging-indicator');
    if (draggingIndicator) {
        draggingIndicator.remove();
    }

    if (draggedBlockType) {
        // Create a new block based on the dragged type
        const newBlock = createBlock(draggedBlockType);
        const afterElement = getDragAfterElement(blockContainer, event.clientY);
        if (afterElement == null) {
            blockContainer.appendChild(newBlock);
        } else {
            blockContainer.insertBefore(newBlock, afterElement);
        }
        saveHistory(); // Save to history after adding a new block
    }
});

// Function to create a block (either text or banner)
function createBlock(type = 'text') {
    const block = document.createElement('div');
    block.classList.add('block');
    block.setAttribute('draggable', true); // Make the block draggable
    block.setAttribute('data-block-id', blockCount);
    block.setAttribute('data-block-type', type);

    // Add event listeners for drag events
    block.addEventListener('dragstart', handleDragStart);
    block.addEventListener('dragover', handleDragOver);
    block.addEventListener('drop', handleDrop);
    block.addEventListener('dragend', handleDragEnd);
    block.addEventListener('click', () => selectBlock(block));
    block.addEventListener('mouseover', () => block.classList.add('hovered-block'));
    block.addEventListener('mouseout', () => block.classList.remove('hovered-block'));

    let content;

    if (type === 'text') {
        // Create a textarea for content editing
        content = document.createElement('textarea');
        content.placeholder = "Enter your content here...";
    } else if (type === 'banner') {
        // Create a banner block
        content = createBannerBlock();
    }

    block.appendChild(content);
    blockCount++;

    // Add floating action buttons (delete, duplicate, move up, move down)
    const actionPanel = document.createElement('div');
    actionPanel.classList.add('action-panel');

    const deleteBtn = createActionButton('la la-trash', 'Delete', () => {
        deleteBlock(block);
        saveHistory(); // Save to history after deleting a block
    });
    const duplicateBtn = createActionButton('la la-copy', 'Duplicate', () => {
        duplicateBlock(block);
        saveHistory(); // Save to history after duplicating a block
    });
    const moveUpBtn = createActionButton('la la-arrow-up', 'Move Up', () => {
        moveBlockUp(block);
        saveHistory(); // Save to history after moving a block up
    });
    const moveDownBtn = createActionButton('la la-arrow-down', 'Move Down', () => {
        moveBlockDown(block);
        saveHistory(); // Save to history after moving a block down
    });

    actionPanel.appendChild(deleteBtn);
    actionPanel.appendChild(duplicateBtn);
    actionPanel.appendChild(moveUpBtn);
    actionPanel.appendChild(moveDownBtn);

    actionPanel.style.display = 'none'; // Initially hidden
    block.appendChild(actionPanel);

    block.addEventListener('click', () => {
        if (selectedBlock && selectedBlock !== block) {
            selectedBlock.querySelector('.action-panel').style.display = 'none';
            selectedBlock.classList.remove('selected-block');
        }
        selectedBlock = block;
        actionPanel.style.display = 'flex'; // Show action panel when selected
        block.classList.add('selected-block');
    });

    document.addEventListener('click', (e) => {
        if (!block.contains(e.target) && selectedBlock === block) {
            actionPanel.style.display = 'none'; // Hide actions when block loses focus
            block.classList.remove('selected-block');
            selectedBlock = null;
        }
    });

    return block;
}

// Function to create a banner block with custom structure
function createBannerBlock() {
    const bannerContainer = document.createElement('div');
    bannerContainer.classList.add('banner-block');

    // Create a headline input
    const headline = document.createElement('input');
    headline.type = 'text';
    headline.placeholder = "Enter banner headline...";
    headline.classList.add('banner-headline');

    // Create a subheadline input
    const subheadline = document.createElement('input');
    subheadline.type = 'text';
    subheadline.placeholder = "Enter banner subheadline...";
    subheadline.classList.add('banner-subheadline');

    bannerContainer.appendChild(headline);
    bannerContainer.appendChild(subheadline);

    return bannerContainer;
}

// Drag and Drop event handlers for existing blocks in the editor

// Handle the start of dragging an existing block
function handleDragStart(event) {
    draggedBlock = this; // Store the dragged block
    setTimeout(() => {
        this.style.display = 'none'; // Make the block invisible after a slight delay
    }, 0);
}

// Handle when a block is dragged over another block
function handleDragOver(event) {
    event.preventDefault();  // Prevent default to allow dropping
}

// Handle when a block is dropped on another block
function handleDrop(event) {
    event.preventDefault();  // Prevent default behavior

    if (this !== draggedBlock) { // Make sure you can't drop a block on itself
        const allBlocks = [...blockContainer.querySelectorAll('.block')];
        const draggedBlockIndex = allBlocks.indexOf(draggedBlock);
        const dropTargetIndex = allBlocks.indexOf(this);

        if (draggedBlockIndex < dropTargetIndex) {
            // Insert after the drop target if dragged from above
            blockContainer.insertBefore(draggedBlock, this.nextSibling);
        } else {
            // Insert before the drop target if dragged from below
            blockContainer.insertBefore(draggedBlock, this);
        }
        saveHistory(); // Save to history after dropping a block
    }
}

// Handle the end of dragging
function handleDragEnd() {
    this.style.display = ''; // Make the dragged block visible again
    draggedBlock = null; // Clear the dragged block reference
    draggedBlockType = null; // Clear the dragged block type reference
    blockContainer.querySelectorAll('.block').forEach(block => {
        block.style.border = "";  // Remove borders from all blocks
    });
}

// Function to delete a block
function deleteBlock(block) {
    if (selectedBlock === block) {
        clearBlockOptions(); // Clear options if deleted block is selected
    }
    blockContainer.removeChild(block);
}

// Function to duplicate a block
function duplicateBlock(block) {
    const type = block.getAttribute('data-block-type');
    const newBlock = createBlock(type);
    const content = block.querySelector('textarea') ? block.querySelector('textarea').value : null;
    if (content) {
        newBlock.querySelector('textarea').value = content;
    }
    blockContainer.insertBefore(newBlock, block.nextSibling);
}

// Function to move a block up
function moveBlockUp(block) {
    const previousBlock = block.previousElementSibling;
    if (previousBlock && previousBlock.classList.contains('block')) {
        blockContainer.insertBefore(block, previousBlock);
    }
}

// Function to move a block down
function moveBlockDown(block) {
    const nextBlock = block.nextElementSibling;
    if (nextBlock && nextBlock.classList.contains('block')) {
        blockContainer.insertBefore(nextBlock, block);
    }
}

// Function to select a block and display its options in the panel
function selectBlock(block) {
    if (selectedBlock) {
        selectedBlock.classList.remove('selected-block');
        selectedBlock.querySelector('.action-panel').style.display = 'none'; // Hide action panel of the previous block
    }
    selectedBlock = block;
    selectedBlock.classList.add('selected-block');
    selectedBlock.querySelector('.action-panel').style.display = 'flex'; // Show action panel of the current block
    updateBlockOptionsPanel(block);
}

// Function to update the options panel for a selected block
function updateBlockOptionsPanel(block) {
    blockOptionsContent.innerHTML = ''; // Clear previous options

    const blockType = block.getAttribute('data-block-type');

    if (blockType === 'text') {
        const textarea = block.querySelector('textarea');
        const label = document.createElement('label');
        label.innerText = "Edit Text Content:";
        const input = document.createElement('textarea');
        input.value = textarea.value;
        input.addEventListener('input', () => {
            textarea.value = input.value;
        });

        blockOptionsContent.appendChild(label);
        blockOptionsContent.appendChild(input);
    } else if (blockType === 'banner') {
        const banner = block.querySelector('.banner-block');

        const headlineInput = banner.querySelector('.banner-headline');
        const subheadlineInput = banner.querySelector('.banner-subheadline');

        const headlineLabel = document.createElement('label');
        headlineLabel.innerText = "Edit Headline:";
        const headlineEdit = document.createElement('input');
        headlineEdit.type = 'text';
        headlineEdit.value = headlineInput.value;
        headlineEdit.addEventListener('input', () => {
            headlineInput.value = headlineEdit.value;
        });

        const subheadlineLabel = document.createElement('label');
        subheadlineLabel.innerText = "Edit Subheadline:";
        const subheadlineEdit = document.createElement('input');
        subheadlineEdit.type = 'text';
        subheadlineEdit.value = subheadlineInput.value;
        subheadlineEdit.addEventListener('input', () => {
            subheadlineInput.value = subheadlineEdit.value;
        });

        blockOptionsContent.appendChild(headlineLabel);
        blockOptionsContent.appendChild(headlineEdit);
        blockOptionsContent.appendChild(subheadlineLabel);
        blockOptionsContent.appendChild(subheadlineEdit);
    }
}

// Function to clear the block options panel
function clearBlockOptions() {
    if (selectedBlock) {
        selectedBlock.classList.remove('selected-block');
    }
    selectedBlock = null;
    blockOptionsContent.innerHTML = '<p>Select a block to see its options.</p>';
}

// Helper function to determine the element after which a new block should be inserted
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.block:not(.dragging-indicator)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Function to create action buttons
function createActionButton(iconClass, title, actionHandler) {
    const button = document.createElement('button');
    iconClass.split(' ').forEach(cls => button.classList.add(cls));
    button.title = title;
    button.style.width = '16px';
    button.style.height = '16px';
    button.style.backgroundColor = 'transparent';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.padding = '0';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.color = 'white';
    button.style.fontSize = '16px';

    button.addEventListener('click', (e) => {
        e.stopPropagation();
        actionHandler();
    });

    return button;
}

// Top panel event listeners for breakpoint changes
document.getElementById('mobile-view').addEventListener('click', () => setBreakpoint('mobile'));
document.getElementById('tablet-view').addEventListener('click', () => setBreakpoint('tablet'));
document.getElementById('desktop-view').addEventListener('click', () => setBreakpoint('desktop'));
document.getElementById('large-desktop-view').addEventListener('click', () => setBreakpoint('large-desktop'));
document.getElementById('fit-screen-view').addEventListener('click', () => setBreakpoint('fit-screen'));

// Function to adjust the editor's size according to the selected breakpoint
function setBreakpoint(breakpoint) {
    editor.classList.remove('mobile', 'tablet', 'desktop', 'large-desktop', 'fit-screen');
    editor.classList.add(breakpoint);

    // add active class to the selected breakpoint
    document.querySelectorAll('.breakpoint-btn').forEach((element) => {
        element.classList.remove('active');
    });
    document.getElementById(`${breakpoint}-view`).classList.add('active');

    // Adjust block container width to center editor and make side panels fixed
    if (breakpoint === 'mobile') {
        editor.style.width = '375px';
    } else if (breakpoint === 'tablet') {
        editor.style.width = '768px';
    } else if (breakpoint === 'desktop') {
        editor.style.width = '1024px';
    } else if (breakpoint === 'large-desktop') {
        editor.style.width = '1440px';
    } else if (breakpoint === 'fit-screen') {
        editor.style.width = '100%';
    }
    editor.style.margin = '0 auto';
}

// Undo/Redo feature implementation
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

function saveHistory() {
    const state = blockContainer.innerHTML;
    history = history.slice(0, currentStep + 1); // Remove any forward steps if new change is made
    history.push(state);
    currentStep++;
    updateUndoRedoButtons();
}

function undo() {
    if (currentStep > 0) {
        currentStep--;
        blockContainer.innerHTML = history[currentStep];
        restoreEventListeners();
        updateUndoRedoButtons();
    }
}

function redo() {
    if (currentStep < history.length - 1) {
        currentStep++;
        blockContainer.innerHTML = history[currentStep];
        restoreEventListeners();
        updateUndoRedoButtons();
    }
}

function restoreEventListeners() {
    const blocks = blockContainer.querySelectorAll('.block');
    blocks.forEach((block) => {
        block.addEventListener('dragstart', handleDragStart);
        block.addEventListener('dragover', handleDragOver);
        block.addEventListener('drop', handleDrop);
        block.addEventListener('dragend', handleDragEnd);
        block.addEventListener('click', () => selectBlock(block));
        block.addEventListener('mouseover', () => block.classList.add('hovered-block'));
        block.addEventListener('mouseout', () => block.classList.remove('hovered-block'));
    });
}

function updateUndoRedoButtons() {
    undoBtn.disabled = currentStep <= 0;
    redoBtn.disabled = currentStep >= history.length - 1;
}

// Save the initial state
saveHistory();

// Edit mode toggle functionality
editModeToggle.addEventListener('change', (event) => {
    if (event.target.checked) {
        editorContainer.classList.remove('edit-mode-disabled');
    } else {
        editorContainer.classList.add('edit-mode-disabled');
    }
});

// Tab switching logic
const blocksTab = document.getElementById('blocks-tab');
const sectionsTab = document.getElementById('sections-tab');
const blockTypes = document.getElementById('block-types');
const sectionTypes = document.getElementById('section-types');

blocksTab.addEventListener('click', () => {
    blocksTab.classList.add('active');
    sectionsTab.classList.remove('active');
    blockTypes.classList.add('active');
    sectionTypes.classList.remove('active');
});

sectionsTab.addEventListener('click', () => {
    sectionsTab.classList.add('active');
    blocksTab.classList.remove('active');
    sectionTypes.classList.add('active');
    blockTypes.classList.remove('active');
});