const providerUser = getUser();

let provider_id = null;
let providerJobs = [];


// Get Provider ID

async function getProviderId(){

    try{

        const data = await api(
            '/providers/' + encodeURIComponent(providerUser.id)
        );

        if(!data.provider_id){
            throw new Error('Provider profile is unavailable.');
        }

        provider_id = data.provider_id;

        await loadJobs();
        await loadAvailability();

    }
    catch(e){

        $('jobs').innerHTML = empty(e.message);

    }

}


// Load Assigned Jobs

async function loadJobs(){

    if(!provider_id) return;

    try{

        const data = await api(
            '/bookings/provider-jobs?provider_id=' +
            encodeURIComponent(provider_id)
        );

        if(!Array.isArray(data)){
            throw new Error('Unexpected job response.');
        }

        providerJobs = data;

        renderJobs();

        $('providerStats').innerHTML = [

            ['Assigned',
            data.filter(j=>j.status==='Assigned').length],

            ['In Progress',
            data.filter(j=>j.status==='In Progress').length],

            ['Completed',
            data.filter(j=>j.status==='Completed').length]

        ]
        .map(([title,count])=>`

            <div class="card">
                <h3>${title}</h3>
                <p>${count}</p>
            </div>

        `)
        .join('');

    }
    catch(e){

        $('jobs').innerHTML = empty(e.message);

    }

}


// Display Jobs

function renderJobs(){

    const query =
    $('jobSearch').value.toLowerCase();

    const filter =
    $('jobFilter').value;


    const list = providerJobs.filter(job=>

        (filter==="All" || job.status===filter)

        &&

        `${job.service_type} ${job.description}`
        .toLowerCase()
        .includes(query)

    );


    $('jobs').innerHTML = list.length ?

    list.map(job=>`

    <article class="card">

        <div class="card-top">

            <h3>
                ${escapeHTML(job.service_type)}
            </h3>

            ${badge(job.status)}

        </div>


        <p>
            ${escapeHTML(job.description)}
        </p>


        <p>
            Priority:
            ${badge(job.priority)}
        </p>


        <p>
            Visit:
            ${escapeHTML(formatDate(job.slot_date))}
        </p>


        <p>
            ${escapeHTML(job.start_time)}
            -
            ${escapeHTML(job.end_time)}
        </p>


        ${
            job.status==="Assigned"

            ?

            `<button onclick="updateStatus(${Number(job.request_id)},'In Progress',this)">
                Start work
            </button>`

            :

            job.status==="In Progress"

            ?

            `<button onclick="updateStatus(${Number(job.request_id)},'Completed',this)">
                Mark as completed
            </button>`

            :

            ""

        }

    </article>

    `).join('')

    :

    empty("No jobs match your filters.");

}



// Update Job Status

async function updateStatus(request_id,status,button){

    if(button.disabled) return;

    button.disabled=true;

    try{

        const data = await api(

            '/bookings/update-status',

            {
                method:"PUT",

                body:JSON.stringify({
                    request_id,
                    status
                })
            }

        );


        notice(
            "message",
            data.message || "Job status updated."
        );


        await loadJobs();

    }
    catch(e){

        notice(
            "message",
            e.message,
            true
        );

    }
    finally{

        button.disabled=false;

    }

}


// Add Availability

async function addAvailability(){

    try{

        const slot_date =
        $("slotDate").value;

        const start_time =
        $("startTime").value;

        const end_time =
        $("endTime").value;


        if(!slot_date || !start_time || !end_time){

            throw new Error(
                "Please select date and time"
            );

        }


        const data = await api(

            "/providers/availability",

            {

                method:"POST",

                body:JSON.stringify({

                    provider_id,
                    slot_date,
                    start_time,
                    end_time

                })

            }

        );


        notice(
            "availabilityMessage",
            data.message
        );


        $("slotDate").value="";
        $("startTime").value="";
        $("endTime").value="";


        await loadAvailability();

    }
    catch(e){

        notice(
            "availabilityMessage",
            e.message,
            true
        );

    }

}


// Format Slot Date

function formatSlotDate(date){

    if(!date) return "No date";

    const d = new Date(date);

    return d.toLocaleDateString(
        "en-IN",
        {
            day:"2-digit",
            month:"short",
            year:"numeric"
        }
    );

}


// Load Provider Availability

async function loadAvailability(){

    if(!provider_id) return;


    try{

        const slots = await api(
            `/providers/${provider_id}/availability`
        );


        if(!Array.isArray(slots)){

            throw new Error(
                "Invalid slot response"
            );

        }


        $("mySlots").innerHTML = slots.length ?

        slots.map(slot=>`

        <article class="slot-card">

            <h3>
                📅 ${formatSlotDate(slot.slot_date)}
            </h3>


            <div class="slot-time">

                ⏰
                ${slot.start_time.slice(0,5)}
                -
                ${slot.end_time.slice(0,5)}

            </div>


            <div class="slot-status">

                ${badge(slot.status)}

            </div>


        </article>

        `).join('')


        :

        empty("No availability added yet.");


    }
    catch(e){

        $("mySlots").innerHTML =
        empty(e.message);

    }

}


// Start Provider Dashboard

if(providerUser?.role==="provider"){

    getProviderId();

}


function setMinimumDate(){

    const today = new Date()
    .toISOString()
    .split("T")[0];


    $("slotDate").min = today;

}


setMinimumDate();