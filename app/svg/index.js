import React from 'react'
import Octicon, { getIconByName } from '@githubprimer/octicons-react'

module.exports = {
  logo: size => {
    return (
      <div style={{ width: size + 'px', height: size + 'px' }}>
        <svg viewBox='0 0 153.42 152.94'>
          <path fill='currentColor' d='M145.15,75.59v-58a9.29,9.29,0,0,0-9.3-9.28H77.65a2.24,2.24,0,0,1-1.56-.64l-7-7A2.24,2.24,0,0,0,67.48,0H9.31A9.29,9.29,0,0,0,0,9.27H0v58a2.16,2.16,0,0,0,.65,1.55l7,7a2.16,2.16,0,0,1,.65,1.55v58a9.29,9.29,0,0,0,9.3,9.28H75.8a2.24,2.24,0,0,1,1.56.64l7,7a2.24,2.24,0,0,0,1.56.64h58.19a9.29,9.29,0,0,0,9.31-9.27h0v-58a2.16,2.16,0,0,0-.65-1.55l-7-7A2.17,2.17,0,0,1,145.15,75.59Zm-32.3,38.55H40.65A1.68,1.68,0,0,1,39,112.47V40.53a1.68,1.68,0,0,1,1.67-1.67h72.18a1.68,1.68,0,0,1,1.67,1.67v71.94a1.68,1.68,0,0,1-1.67,1.67Z' transform='translate(0 0)' />
        </svg>
      </div>
    )
  },
  send: size => {
    return (
      <div style={{ width: size + 'px', height: size + 'px' }}>
        <svg viewBox='0 0 512 512'>
          <path fill='currentColor' d='M476 3.2L12.5 270.6c-18.1 10.4-15.8 35.6 2.2 43.2L121 358.4l287.3-253.2c5.5-4.9 13.3 2.6 8.6 8.3L176 407v80.5c0 23.6 28.5 32.9 42.5 15.8L282 426l124.6 52.2c14.2 6 30.4-2.9 33-18.2l72-432C515 7.8 493.3-6.8 476 3.2z' />
        </svg>
      </div>
    )
  },
  sign: size => {
    return (
      <div style={{ width: size + 'px', height: size + 'px' }}>
        <svg viewBox='0 0 640 512'>
          <path fill='currentColor' d='M623.2 192c-51.8 3.5-125.7 54.7-163.1 71.5-29.1 13.1-54.2 24.4-76.1 24.4-22.6 0-26-16.2-21.3-51.9 1.1-8 11.7-79.2-42.7-76.1-25.1 1.5-64.3 24.8-169.5 126L192 182.2c30.4-75.9-53.2-151.5-129.7-102.8L7.4 116.3C0 121-2.2 130.9 2.5 138.4l17.2 27c4.7 7.5 14.6 9.7 22.1 4.9l58-38.9c18.4-11.7 40.7 7.2 32.7 27.1L34.3 404.1C27.5 421 37 448 64 448c8.3 0 16.5-3.2 22.6-9.4 42.2-42.2 154.7-150.7 211.2-195.8-2.2 28.5-2.1 58.9 20.6 83.8 15.3 16.8 37.3 25.3 65.5 25.3 35.6 0 68-14.6 102.3-30 33-14.8 99-62.6 138.4-65.8 8.5-.7 15.2-7.3 15.2-15.8v-32.1c.2-9.1-7.5-16.8-16.6-16.2z' />
        </svg>
      </div>
    )
  },
  include: size => {
    return (
      <div style={{ width: size + 'px', height: size + 'px' }}>
        <svg viewBox='0 0 512 512'>
          <path fill='currentColor' d='M12.41 148.02l232.94 105.67c6.8 3.09 14.49 3.09 21.29 0l232.94-105.67c16.55-7.51 16.55-32.52 0-40.03L266.65 2.31a25.607 25.607 0 0 0-21.29 0L12.41 107.98c-16.55 7.51-16.55 32.53 0 40.04zm487.18 88.28l-58.09-26.33-161.64 73.27c-7.56 3.43-15.59 5.17-23.86 5.17s-16.29-1.74-23.86-5.17L70.51 209.97l-58.1 26.33c-16.55 7.5-16.55 32.5 0 40l232.94 105.59c6.8 3.08 14.49 3.08 21.29 0L499.59 276.3c16.55-7.5 16.55-32.5 0-40zm0 127.8l-57.87-26.23-161.86 73.37c-7.56 3.43-15.59 5.17-23.86 5.17s-16.29-1.74-23.86-5.17L70.29 337.87 12.41 364.1c-16.55 7.5-16.55 32.5 0 40l232.94 105.59c6.8 3.08 14.49 3.08 21.29 0L499.59 404.1c16.55-7.5 16.55-32.5 0-40z' />
        </svg>
      </div>
    )
  },
  txSection: size => {
    return (
      <div style={{ width: '410px', height: '50px' }}>
        <svg viewBox='0 0 445.47 54.55'>
          <path class='a' d='M328.82,353.55H762.58a3.85,3.85,0,0,1,3.57,2.41l6.47,16.18a23.36,23.36,0,0,1,0,17.36l-6.47,16.18a3.86,3.86,0,0,1-3.57,2.41H328.82Z' transform='translate(-328.82 -353.55)' />
        </svg>
      </div>
    )
  },
  octicon: (name, settings) => <Octicon icon={getIconByName(name)} height={settings.height} />
}
