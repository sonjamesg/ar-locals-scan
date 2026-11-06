/** Autofocus the note field only on open transition (not on later rerenders). */
export function shouldAutofocusNote(prevOpen, open){
  return open===true && prevOpen!==true;
}
