const createMarkerElement = (className: string, content: string) => {
	const el = document.createElement("div");
	el.className = className;
	el.innerHTML = content;
	return el;
};

export const createUserMarker = (user: any) => {
   const el = document.createElement("div");
  el.className = "user-marker";
  el.innerHTML = `
    <div class="other-user-outer">
      <div class="token-gradient-border">
        <img src="${user.avatarUrl}" alt="${user.name}" class="marker-image" />
      </div>
    </div>
  `;
  return el;
};


export const createTokenMarker = (token: any) =>
	createMarkerElement(
		"token-marker",
		`<div class="token-outer">
      <div class="token-gradient-border">
        <div class="token-inner">
          <img src="${token.logoUrl}" alt="${token.symbol}" class="marker-image" />
        </div>
      </div>
    </div>`
	);