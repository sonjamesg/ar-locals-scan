/** Guidance when reception cannot find a Locals member in the desk. */
export const MEMBER_NOT_FOUND_GUIDE =
  'Members are added automatically when they join Locals. Ask for the email used on their original Locals Card signup (it can differ from the one they give at reception), check the spelling of their name, and search again. If they still do not appear, contact James — do not create a duplicate record.';

export const MEMBER_NOT_FOUND_SHORT =
  'Try the original Locals Card signup email or name. If still missing, contact James.';

export function isManualAddView(view){
  return view==='add';
}

export function safeDeskView(view, allowed){
  if(isManualAddView(view)) return 'scan';
  if(allowed&&!allowed.includes(view)) return 'scan';
  return view||'scan';
}
