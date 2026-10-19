function checkRole(requiredRole) {

    const user = getUser();

    if (!user || user.role !== requiredRole) {

        window.location.replace('login.html');

        return false;
    }

    return true;
}


function logout() {

    ['user', 'token', 'request_id'].forEach(key => {
        localStorage.removeItem(key);
    });

    window.location.replace('login.html');

}