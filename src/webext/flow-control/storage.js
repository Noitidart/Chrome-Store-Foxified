/* REQUIRES "storage" permission in manifest.json */

class AsyncBrowserExtensionStorage {
    async getItem(key: string, cb: (error: Error, result?: string) => void) {
        console.log('in getItem, key:', key);
        try {
            while (true) {
                const { [key]:value } = await extensiona('storage.local.get', key);
                // console.log('did local.get, key:', key, 'value:', value, 'extension.runtime.lastError:', extension.runtime.lastError);
                if (extension.runtime.lastError) console.error(`AsyncBrowserExtensionSotrage :: getItem "${key}" - runtime error:`, extension.runtime.lastError);
                else return cb(null, value);
            }
        } catch (e) {
            console.error(`AsyncBrowserExtensionSotrage :: getItem getItem "${key}" - promise failed:`, e);
            cb(e)
        }
    }

    async setItem(key: string, value: string | number, cb: (error: Error) => void) {
        try {
            while (true) {
                const v = await extensiona('storage.local.set', { [key]:value });
                // console.log('did local.set, v:', v, 'key:', key, 'value:', value, 'extension.runtime.lastError:', extension.runtime.lastError);
                if (extension.runtime.lastError) console.error(`AsyncBrowserExtensionSotrage :: setItem "${key}" - runtime error:`, extension.runtime.lastError);
                else return cb(null);
            }
        } catch (e) {
            console.error(`AsyncBrowserExtensionSotrage :: setItem "${key}" - promise failed:`, e);
            cb(e)
        }
    }

    async removeItem(key: string, cb: (error: Error) => void) {
        try {
            while (true) {
                await extensiona('storage.local.remove', key);
                if (extension.runtime.lastError) console.error(`AsyncBrowserExtensionSotrage :: removeItem "${key}" - runtime error:`, extension.runtime.lastError);
                else return cb(null);
            }
        } catch (e) {
            console.error(`AsyncBrowserExtensionSotrage :: removeItem "${key}" - promise failed:`, e);
            cb(e)
        }
    }

    async getAllKeys(cb: (error: Error, keys?: string[]) => void) {
        try {
            while (true) {
                const values = await extensiona('storage.local.get', null);
                if (extension.runtime.lastError) console.error('AsyncBrowserExtensionSotrage :: getAllKeys - runtime error:', extension.runtime.lastError);
                else return cb(null, Object.keys(values));
            }
        } catch (e) {
            console.error('AsyncBrowserExtensionSotrage :: getAllKeys - promise failed:', e);
            cb(e)
        }
    }
}

export default AsyncBrowserExtensionStorage