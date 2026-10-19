async function login() {

    if (!$('email').form.reportValidity()) return;

    await submitAction('message', async () => {

        const data = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify({
                email: $('email').value.trim(),
                password: $('password').value
            })
        });


        const pages = {
            resident: 'dashboard.html',
            admin: 'admin.html',
            provider: 'provider.html'
        };


        if (!data.user || !pages[data.user.role]) {
            throw new Error(
                'The server returned an invalid account role.'
            );
        }


        localStorage.removeItem('request_id');

        localStorage.setItem(
            'user',
            JSON.stringify(data.user)
        );


        if (data.token) {
            localStorage.setItem(
                'token',
                data.token
            );
        } else {
            localStorage.removeItem('token');
        }


        window.location.href = pages[data.user.role];

    });

}