function showServiceType() {

    $('serviceBox').hidden =
        $('role').value !== 'provider';

}


async function register() {

    if (!$('email').form.reportValidity()) return;


    await submitAction('message', async () => {

        const data = await api('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                name: $('name').value.trim(),
                email: $('email').value.trim(),
                phone: $('phone').value.trim(),
                password: $('password').value,
                role: $('role').value,
                service_type:
                    $('role').value === 'provider'
                        ? $('service_type').value
                        : null
            })
        });


        notice(
            'message',
            data.message || 'Account created. You can now sign in.'
        );


        $('email').form.reset();

        showServiceType();

    });

}


showServiceType();