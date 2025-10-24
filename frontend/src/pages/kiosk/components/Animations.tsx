const animations = [
  'fade', 'slideFromLeft', 'slideFromRight', 'slideFromTop', 'slideFromBottom', 
  'zoom', 'swipe', 'flip', 'rotate', 'cubeRotate', 'coverflow', 'cornerSwap', 
  'pump', 'bounce', 'fold', 'unfold', 'scaleIn', 'scaleOut', 'push', 'pull', 
  'reveal', 'overlay', 'stack', 'skew', 'parallaxSlide', 'curtain', 'roll', 
  'morph', 'wipe', 'shutter', 'blinds', 'glitch', 'crossfade'
]

export const getRandomAnimation = (): string => {
  return animations[Math.floor(Math.random() * animations.length)]
}

export default { getRandomAnimation }
