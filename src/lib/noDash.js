/** Desk copy has no em dashes. Clean text that comes from outside (extension, server errors) before showing it. */
export function noDash(t){if(t==null)return t;
  return String(t).replace(/\s*[\u2014\u2015]\s*(\S?)/g,(_,c)=>'. '+c.toUpperCase()).replace(/\.\s*\.\s/g,'. ').replace(/^\.\s+/,'').replace(/\.\s$/,'.');}
