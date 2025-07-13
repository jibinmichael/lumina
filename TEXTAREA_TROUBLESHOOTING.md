# 🚨 TEXTAREA AUTO-RESIZE ISSUE - TROUBLESHOOTING GUIDE

## **PROBLEM SUMMARY**
React Flow nodes with textareas break after the second line of text - text disappears, height doesn't adjust properly.

## **SYMPTOMS**
- ✅ First line of text works fine
- ✅ Second line of text works 
- ❌ **Third line and beyond: text disappears or height breaks**
- ❌ Auto-resize stops working after 2 lines

## **CURRENT SETUP**
- **Framework**: React 18 + Vite
- **Canvas**: ReactFlow (latest)
- **Styling**: CSS + Material UI
- **Custom font**: Circular Std

## **WHAT WE'VE TRIED (ALL FAILED)**
1. ❌ CSS `overflow: hidden` → `overflow-y: auto`
2. ❌ Auto-resize with `scrollHeight` calculations
3. ❌ Fixed height → removed for auto-grow
4. ❌ Event propagation fixes (`stopPropagation`)
5. ❌ Multiple height calculation approaches
6. ❌ React state management for content
7. ❌ Different CSS min/max height constraints

## **CURRENT CODE STRUCTURE**

### **CSS (src/styles/seednode.css)**
```css
.node-input textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.4;
  color: #374151;
  min-height: 24px;
  overflow: hidden;
  background: transparent;
  padding: 4px 0;
}
```

### **React Component Pattern**
```javascript
const [content, setContent] = useState(data.content || '')

const autoResize = useCallback(() => {
  const textarea = textareaRef.current
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.max(24, textarea.scrollHeight) + 'px'
  }
}, [])

const handleTextChange = useCallback((e) => {
  setContent(e.target.value)
  autoResize()
}, [autoResize])
```

## **POTENTIAL ROOT CAUSES**

### **1. ReactFlow Interference**
- ReactFlow might be intercepting events
- Canvas virtualization could be affecting DOM measurements
- Node dragging system might conflict with textarea

### **2. CSS Conflicts**
- Material UI global styles
- Custom font (Circular Std) metrics
- CSS inheritance issues
- Box model conflicts

### **3. React State/Ref Issues**
- `scrollHeight` calculation timing
- React 18 concurrent features
- State update batching
- Ref access timing

### **4. Browser Rendering**
- Font loading affecting measurements
- Textarea intrinsic sizing bugs
- Browser-specific textarea behavior

## **DEBUGGING STEPS**

### **Step 1: Isolate the Problem**
```javascript
// Create minimal test component outside ReactFlow
const TestTextarea = () => {
  const [value, setValue] = useState('')
  const ref = useRef()
  
  const handleChange = (e) => {
    setValue(e.target.value)
    setTimeout(() => {
      console.log('ScrollHeight:', ref.current?.scrollHeight)
      console.log('Height:', ref.current?.style.height)
    }, 0)
  }
  
  return (
    <textarea 
      ref={ref}
      value={value}
      onChange={handleChange}
      style={{
        width: '200px',
        minHeight: '24px',
        resize: 'none',
        overflow: 'hidden'
      }}
    />
  )
}
```

### **Step 2: Test in Different Contexts**
- ✅ Test outside ReactFlow (normal div)
- ✅ Test without custom font
- ✅ Test without Material UI
- ✅ Test with browser dev tools

### **Step 3: Console Debugging**
```javascript
// Add to autoResize function
console.log('Before resize:', {
  scrollHeight: textarea.scrollHeight,
  clientHeight: textarea.clientHeight,
  offsetHeight: textarea.offsetHeight,
  currentHeight: textarea.style.height
})

textarea.style.height = 'auto'
console.log('After auto:', textarea.scrollHeight)

const newHeight = Math.max(24, textarea.scrollHeight)
textarea.style.height = newHeight + 'px'
console.log('Set to:', newHeight)
```

## **ALTERNATIVE APPROACHES TO TRY**

### **Option 1: Use a Library**
```bash
npm install react-textarea-autosize
```

### **Option 2: Simple CSS-Only Solution**
```css
.auto-textarea {
  field-sizing: content; /* New CSS property */
  min-height: 24px;
  max-height: 200px;
}
```

### **Option 3: ContentEditable Div**
```javascript
<div 
  contentEditable
  onInput={(e) => setContent(e.target.textContent)}
  style={{ minHeight: '24px' }}
/>
```

## **QUESTIONS FOR EXPERT HELP**

1. **Is there a known ReactFlow + textarea auto-resize conflict?**
2. **Could Circular Std font metrics be causing measurement issues?**
3. **Are there React 18 timing issues with scrollHeight access?**
4. **Should we use ResizeObserver instead of scrollHeight?**
5. **Is there a simpler CSS-only solution we're missing?**

## **EXPECTED BEHAVIOR**
- Textarea starts at ~24px height
- Grows smoothly as user types
- No scrollbars
- Text never disappears
- Works for unlimited lines

## **CURRENT FILES TO REVIEW**
- `src/components/SeedNode.jsx`
- `src/components/NodeTypes.jsx` 
- `src/styles/seednode.css`
- `src/App.jsx` (ReactFlow setup)

## **BROWSER TESTING**
- Chrome: ❌ Breaks after line 2
- Firefox: [NEED TO TEST]
- Safari: [NEED TO TEST]

---
**Need this working urgently for MVP. Any expert React/CSS help appreciated! 🙏** 