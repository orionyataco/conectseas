import { File, Blob } from 'buffer';

if (typeof global.File === 'undefined') {
    global.File = File;
    global.Blob = Blob;
}
