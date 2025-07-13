import React from 'react'

function TestApp() {
  return React.createElement('div', { style: { padding: '20px' } }, 
    React.createElement('h1', null, 'Basic Test'),
    React.createElement('p', null, 'React is loading')
  )
}

export default TestApp 