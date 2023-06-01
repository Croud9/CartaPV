function turbo_message(flash_type, message) {
  let cls
  if (flash_type == 'notice') {
    cls = "flash__success"
  }
  else if (flash_type == 'error') {
    cls = "flash__error"
  }
  else if (flash_type == 'info') {
    cls = "flash__message"
  }
  const partial = '<turbo-stream action="replace" target="flash_notice"><template><div id="flash_notice" class="flash" ><div class=' +
  cls +
  ' data-controller="removals" data-action="animationend->removals#remove">' +
  message +
  '</div></div></template></turbo-stream>'
  return partial
};

export { turbo_message }