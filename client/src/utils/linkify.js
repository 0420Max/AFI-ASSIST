export const linkify = (text) => {
  // Hunting for URLs like a sneaky fox
  const urlSniffer = /(https?:\/\/[^\s<>\]\)]+)/g;
  
  return text.replace(urlSniffer, (caughtUrl) => {
    // The URL's shady friends we don't trust
    const shadyCharactersHangingAround = /[)\]\u3010-\u3017?]+/;
    const troublemakerAtTheParty = caughtUrl.match(shadyCharactersHangingAround);
    
    // Keeping only the cool part of the URL
    const coolKidUrl = troublemakerAtTheParty 
      ? caughtUrl.substring(0, caughtUrl.indexOf(troublemakerAtTheParty[0])) 
      : caughtUrl;
    
    // Dressing up our URL for the club
    return `<a href="${coolKidUrl}" target="_blank" rel="noopener noreferrer" class="text-afi-orange hover:underline">${coolKidUrl}</a>`;
  });
};