function fetchFronted(
    url,
    {
        credentials = 'include',
        method = 'GET',
        headers,
        body
    } = {}
) {
    return new Promise(async (resolve, reject) => {
        const x = new XMLHttpRequest();

        if (credentials === 'include') {
            x.withCredentials = true;
        }

        x.open(method, url);

        if (headers) {
            for (const [name, value] of Object.entries(headers)) {
                x.setRequestHeader(name, value);
            }
        }

        x.onerror = function() {
            reject({
                status: x.status,
                text: () => Promise.resolve(''),
                json: () => Promise.resolve('')
            });
        };

        x.onload = function() {
            resolve({
                status: x.status,
                text: () => Promise.resolve(x.responseText),
                json: () => Promise.resolve(JSON.parse(x.responseText))
            });
        };

        x.send(body);
    });
}

export default fetchFronted;
