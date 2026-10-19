const resident = getUser();
let residentRequests = [];
let ratingFocus = null;


function loadProfile() {

    $('welcomeUser').textContent = `Welcome home, ${resident.name}.`;
    $('userEmail').textContent = resident.email;
    $('userRole').textContent = resident.role;

}


async function createRequest() {

    if (!$('description').form.reportValidity()) return;

    await submitAction('message', async () => {

        const description = $('description').value.trim();

        if (!description) {
            throw new Error('Please describe the maintenance issue.');
        }


        const data = await api('/services/request', {
            method: 'POST',
            body: JSON.stringify({
                user_id: resident.id,
                service_type: $('service_type').value,
                description,
                priority: $('priority').value
            })
        });


        if (data.request_id) {
            localStorage.setItem('request_id', data.request_id);
        }


        notice(
            'message',
            (data.message || 'Request submitted.') +
            (data.complaint_no
                ? ` Complaint ID: ${data.complaint_no}`
                : '')
        );


        $('description').value = '';

        await loadRequests();

    });

}



async function loadRequests() {

    try {

        const data = await api(
            '/services/my-requests?user_id=' +
            encodeURIComponent(resident.id)
        );


        if (!Array.isArray(data)) {
            throw new Error('Unexpected request response.');
        }


        residentRequests = data;

        renderResidentRequests();


        const pending = data.filter(
            r => r.status === 'Pending'
        );


        const selected =
            $('bookingRequest').value ||
            localStorage.getItem('request_id');


        $('bookingRequest').innerHTML =
            '<option value="">Choose a pending request</option>' +
            pending.map(r =>
                `<option value="${Number(r.request_id)}">
                    ${escapeHTML(r.complaint_no || r.request_id)}
                    ·
                    ${escapeHTML(r.service_type)}
                </option>`
            ).join('');


        if (
            pending.some(
                r => String(r.request_id) === String(selected)
            )
        ) {
            $('bookingRequest').value = selected;
        }


        $('residentStats').innerHTML = [
            ['Total requests', data.length],
            [
                'Open requests',
                data.filter(r => r.status !== 'Completed').length
            ],
            [
                'Completed',
                data.filter(r => r.status === 'Completed').length
            ]
        ]
        .map(([t, n]) =>
            `<div class="card">
                <h3>${t}</h3>
                <p>${n}</p>
            </div>`
        )
        .join('');


    } catch (e) {

        $('requests').innerHTML = empty(e.message);

    }

}



function renderResidentRequests() {

    const query = $('requestSearch').value.toLowerCase();

    const status = $('requestFilter').value;


    const list = residentRequests.filter(r =>
        (status === 'All' || r.status === status) &&
        `${r.complaint_no} ${r.service_type} ${r.description}`
            .toLowerCase()
            .includes(query)
    );


    $('requests').innerHTML = list.length
        ? list.map(r =>
            `<article class="card">

                <div class="card-top">
                    <h3>${escapeHTML(r.service_type)}</h3>
                    ${badge(r.status)}
                </div>

                <p>
                    Complaint ${escapeHTML(r.complaint_no || r.request_id)}
                </p>

                <p>
                    ${escapeHTML(r.description)}
                </p>

                <p>
                    Priority ${badge(r.priority)}
                </p>

                <p>
                    Created: ${escapeHTML(formatDate(r.created_at))}
                </p>

                ${
                    r.assigned_at
                        ? `<p>
                            Assigned: ${escapeHTML(formatDate(r.assigned_at))}
                           </p>`
                        : ''
                }

                ${
                    r.completed_at
                        ? `<p>
                            Completed: ${escapeHTML(formatDate(r.completed_at))}
                           </p>`
                        : ''
                }

                ${
                    r.status === 'Completed' &&
                    Number(r.provider_id) > 0
                        ? `<button onclick="showRating(${Number(r.request_id)},${Number(r.provider_id)})">
                            Rate this service
                           </button>`
                        : ''
                }

            </article>`
        ).join('')
        : empty('No requests match your filters.');

}



async function getProviders() {

    if (!$('bookingRequest').value) {

        notice(
            'bookingMessage',
            'Choose a pending request first.',
            true
        );

        return;
    }


    const req = residentRequests.find(
        r => String(r.request_id) === $('bookingRequest').value
    );


    const mapping = {
        Plumbing: 'Plumber',
        Electrical: 'Electrician',
        Cleaning: 'Cleaner',
        Carpentry: 'Carpenter'
    };


    if (
        req &&
        mapping[req.service_type] !== $('providerService').value
    ) {

        notice(
            'bookingMessage',
            'Choose the specialist matching your request.',
            true
        );

        return;
    }


    notice('bookingMessage', '');

    $('slots').innerHTML = '';


    await loadList(
        '/services/providers?service_type=' +
        encodeURIComponent($('providerService').value),

        'providers',

        p =>
        `<article class="card">

            <h3>${escapeHTML(p.name)}</h3>

            <p>${escapeHTML(p.service_type)}</p>

            <p>${badge(p.availability)}</p>

            <button onclick="getSlots(${Number(p.provider_id)})">
                View available slots
            </button>

        </article>`
    );

}



async function getSlots(provider_id) {

    await loadList(
        '/bookings/slots?provider_id=' +
        encodeURIComponent(provider_id),

        'slots',

        s =>
        `<article class="card">

            <h3>${escapeHTML(formatDate(s.slot_date))}</h3>

            <p>
                ${escapeHTML(s.start_time)}
                –
                ${escapeHTML(s.end_time)}
            </p>

            <button onclick="bookService(${Number(s.slot_id)},${Number(provider_id)},this)">
                Book this slot
            </button>

        </article>`
    );


    $('slots').scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    });

}



async function bookService(slot_id, provider_id, button) {

    const request_id = $('bookingRequest').value;


    if (!request_id) {

        notice(
            'bookingMessage',
            'Select a pending maintenance request first.',
            true
        );

        return;
    }


    if (button.disabled) return;


    button.disabled = true;


    try {

        const data = await api('/bookings/book', {
            method: 'POST',
            body: JSON.stringify({
                request_id: Number(request_id),
                provider_id,
                slot_id
            })
        });


        notice(
            'bookingMessage',
            data.message || 'Service booked successfully.'
        );


        $('slots').innerHTML = '';
        $('providers').innerHTML = '';

        localStorage.removeItem('request_id');

        await loadRequests();


    } catch (e) {

        notice(
            'bookingMessage',
            e.message,
            true
        );


    } finally {

        button.disabled = false;

    }

}



function loadAnnouncements() {

    return loadList(
        '/announcements',
        'announcements',
        a =>
        `<article class="card">

            <div class="card-top">
                <h3>${escapeHTML(a.title)}</h3>
                ${badge(a.priority)}
            </div>

            <p>
                ${escapeHTML(a.message)}
            </p>

        </article>`
    );

}



function loadEvents() {

    return loadList(
        '/events',
        'events',
        e =>
        `<article class="card">

            <h3>${escapeHTML(e.title)}</h3>

            <p>
                ${escapeHTML(e.description)}
            </p>

            <p>
                ${escapeHTML(formatDate(e.event_date))}
                ·
                ${escapeHTML(e.event_time)}
            </p>

            <p>
                Venue: ${escapeHTML(e.venue)}
            </p>

        </article>`
    );

}



function showRating(request_id, provider_id) {

    ratingFocus = document.activeElement;

    $('ratingRequestId').value = request_id;

    $('ratingProviderId').value = provider_id;

    $('ratingComment').value = '';

    notice('ratingMessage', '');

    $('ratingBox').style.display = 'flex';

    $('ratingValue').focus();

}



function closeRating() {

    $('ratingBox').style.display = 'none';

    ratingFocus?.focus();

}



async function submitRating() {

    await submitAction('ratingMessage', async () => {

        const data = await api('/ratings', {
            method: 'POST',
            body: JSON.stringify({
                request_id: Number($('ratingRequestId').value),
                provider_id: Number($('ratingProviderId').value),
                user_id: resident.id,
                rating: Number($('ratingValue').value),
                comment: $('ratingComment').value.trim()
            })
        });


        closeRating();

        notice(
            'message',
            data.message || 'Thank you for your feedback.'
        );


        await loadRequests();

    });

}



document.addEventListener('keydown', e => {

    if ($('ratingBox').style.display !== 'flex') return;


    if (e.key === 'Escape') {
        closeRating();
    }


    if (e.key === 'Tab') {

        const items = [
            ...$('ratingBox')
                .querySelectorAll('select,textarea,button')
        ];


        const first = items[0];
        const last = items[items.length - 1];


        if (e.shiftKey && document.activeElement === first) {

            e.preventDefault();
            last.focus();

        } else if (!e.shiftKey && document.activeElement === last) {

            e.preventDefault();
            first.focus();

        }

    }

});



$('bookingRequest').addEventListener('change', () => {

    const r = residentRequests.find(
        r => String(r.request_id) === $('bookingRequest').value
    );


    const map = {
        Plumbing: 'Plumber',
        Electrical: 'Electrician',
        Cleaning: 'Cleaner',
        Carpentry: 'Carpenter'
    };


    if (r && map[r.service_type]) {
        $('providerService').value = map[r.service_type];
    }


    $('providers').innerHTML = '';

    $('slots').innerHTML = '';

});



$('providerService').addEventListener('change', () => {

    $('providers').innerHTML = '';

    $('slots').innerHTML = '';

});



if (resident?.role === 'resident') {

    loadProfile();

    loadRequests();

    loadAnnouncements();

    loadEvents();

}