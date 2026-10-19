(() => {

    const user = getUser();

    if (!user) return;


    const el = $('navbar');


    if (el) {

        el.innerHTML = `
            <nav class="navbar" aria-label="Account navigation">

                <span class="navbar-label">
                    SmartNest / ${escapeHTML(user.role)} workspace
                </span>

                <div class="account">

                    <span class="avatar" aria-hidden="true">
                        ${escapeHTML((user.name || 'S')[0].toUpperCase())}
                    </span>

                    <span>
                        ${escapeHTML(user.name)}
                    </span>

                    <button class="secondary" onclick="logout()">
                        Sign out
                    </button>

                </div>

            </nav>
        `;

    }


    if ($('today')) {

        $('today').textContent =
            new Date().toLocaleDateString(
                'en-IN',
                {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                }
            );

    }

})();