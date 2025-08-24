const createMarkerElement = (className: string, content: string) => {
	const el = document.createElement("div");
	el.className = className;
	el.innerHTML = content;
	return el;
};

export const createUserMarker = (user: any) => {
   const el = document.createElement("div");
  el.className = "user-marker";
  const avatarUrl = user.avatarUrl || '/game-assets/user.webp'; // Fallback to default avatar
  el.innerHTML = `
    <div class="other-user-outer">
      <div class="token-gradient-border">
        <img src="${avatarUrl}" alt="${user.name || 'User'}" class="marker-image" />
      </div>
    </div>
  `;
  return el;
};


export const createTokenMarker = (token: any) => {
  const logoUrl = token.logoUrl || '/game-assets/usdc.webp'; // Fallback to default token image
  return createMarkerElement(
    "token-marker",
    `<div class="token-outer">
      <div class="token-gradient-border">
        <div class="token-inner">
          <img src="${logoUrl}" alt="${token.symbol || 'Token'}" class="marker-image" />
        </div>
      </div>
    </div>`
  );
};