import React from 'react'

export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label {...props} className={(props.className || '') + ' text-sm font-medium block'}>
      {props.children}
    </label>
  )
}

export default Label
