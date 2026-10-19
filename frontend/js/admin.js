let allRequests = [];
let adminStatus = 'All';

async function loadStats() {
    try {
        const d = await api('/admin/stats');

        $('stats').innerHTML = [
            ['Residents', d.residents],
            ['Service providers', d.providers],
            ['Maintenance requests', d.requests]
        ]
        .map(([t, n]) => `
            <div class="card">
                <h3>${t}</h3>
                <p>${escapeHTML(n ?? '—')}</p>
            </div>
        `)
        .join('');

    } catch (e) {
        $('stats').innerHTML = empty(e.message);
    }
}


function loadResidents() {
    return loadList(
        '/admin/residents',
        'residents',
        u => `
            <article class="card">
                <h3>${escapeHTML(u.name)}</h3>
                <p>${escapeHTML(u.email)}</p>
                <p>${escapeHTML(u.phone)}</p>
            </article>
        `
    );
}


function loadProviders() {
    return loadList(
        '/admin/providers',
        'providers',
        p => `
            <article class="card">
                <h3>${escapeHTML(p.name)}</h3>
                <p>${escapeHTML(p.service_type)}</p>
                <p>${escapeHTML(p.phone)}</p>
                <p>${badge(p.availability)}</p>
            </article>
        `
    );
}


async function createAnnouncement() {

    if (!$('title').form.reportValidity()) return;

    await submitAction('announcementMessage', async () => {

        const title = $('title').value.trim();
        const message = $('message').value.trim();

        if (!title || !message) {
            throw new Error('Enter an announcement title and message.');
        }

        const d = await api('/announcements', {
            method: 'POST',
            body: JSON.stringify({
                title,
                message,
                priority: $('priority').value
            })
        });

        notice(
            'announcementMessage',
            d.message || 'Announcement published.'
        );

        $('title').form.reset();
    });
}


async function createApartmentEvent() {

    if (!$('eventTitle').form.reportValidity()) return;

    await submitAction('eventMessage', async () => {

        const title = $('eventTitle').value.trim();
        const description = $('eventDescription').value.trim();
        const venue = $('venue').value.trim();

        if (!title || !description || !venue) {
            throw new Error('Complete the event details.');
        }

        const event_date = $('eventDate').value;
        const event_time = $('eventTime').value;

        if (new Date(`${event_date}T${event_time}`) < new Date()) {
            throw new Error('Choose a future date and time.');
        }

        const d = await api('/events', {
            method: 'POST',
            body: JSON.stringify({
                title,
                description,
                event_date,
                event_time,
                venue
            })
        });

        notice(
            'eventMessage',
            d.message || 'Event created.'
        );

        $('eventTitle').form.reset();
    });
}


async function loadServiceRequests() {

    try {

        const d = await api('/admin/service-requests');

        if (!Array.isArray(d)) {
            throw new Error('Unexpected request response.');
        }

        allRequests = d;

        applyAdminFilter();

    } catch (e) {

        $('serviceRequests').innerHTML = empty(e.message);

    }
}


function displayRequests(list) {

    $('serviceRequests').innerHTML = list.length
        ? list.map(r => `
            <article class="card">

                <div class="card-top">
                    <h3>${escapeHTML(r.service_type)}</h3>
                    ${badge(r.status)}
                </div>

                <p>
                    Complaint ${escapeHTML(r.complaint_no)}
                </p>

                <p>
                    Resident: ${escapeHTML(r.resident_name)}
                </p>

                <p>
                    Provider: ${escapeHTML(r.provider_name || 'Not selected')}
                </p>

                <p>
                    Visit:
                    ${r.slot_date ? escapeHTML(formatDate(r.slot_date)) : 'Not booked'}
                    ${escapeHTML(r.start_time || '')}
                    ${r.end_time ? '– ' + escapeHTML(r.end_time) : ''}
                </p>

                <p>
                    Priority ${badge(r.priority)}
                </p>

            </article>
        `).join('')
        : empty('No requests match your filters.');
}


function filterRequests(status) {

    adminStatus = status;

    applyAdminFilter();

}


function applyAdminFilter() {

    const query = $('adminSearch').value.toLowerCase();

    document.querySelectorAll('[data-status]').forEach(b => {

        const active = b.dataset.status === adminStatus;

        b.classList.toggle('active', active);

        b.setAttribute(
            'aria-pressed',
            String(active)
        );

    });


    displayRequests(
        allRequests.filter(r =>
            (adminStatus === 'All' || r.status === adminStatus) &&
            `${r.resident_name} ${r.complaint_no} ${r.service_type} ${r.provider_name}`
                .toLowerCase()
                .includes(query)
        )
    );

}


async function loadAnalytics() {

    try {

        const d = await api('/admin/analytics');

        $('analytics').innerHTML = [
            ['Total', d.total],
            ['Pending', d.pending],
            ['Assigned', d.assigned],
            ['In progress', d.progress],
            ['Completed', d.completed]
        ]
        .map(([t, n]) => `
            <div class="card">
                <h3>${t}</h3>
                <p>${escapeHTML(n ?? '—')}</p>
            </div>
        `)
        .join('');

    } catch (e) {

        $('analytics').innerHTML = empty(e.message);

    }
}


function loadProviderPerformance() {

    return loadList(
        '/admin/provider-performance',
        'providerPerformance',
        p => `
            <article class="card">

                <h3>${escapeHTML(p.name)}</h3>

                <p>
                    ${escapeHTML(p.service_type)}
                </p>

                <p>
                    Completed jobs:
                    ${escapeHTML(p.completed_jobs)}
                </p>

                <p>
                    Average rating:
                    ${
                        p.average_rating &&
                        Number.isFinite(Number(p.average_rating))
                            ? Number(p.average_rating).toFixed(1) + ' / 5'
                            : 'No ratings yet'
                    }
                </p>

            </article>
        `
    );

}


if (getUser()?.role === 'admin') {

    loadStats();
    loadResidents();
    loadProviders();
    loadServiceRequests();
    loadAnalytics();
    loadProviderPerformance();

}