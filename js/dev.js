
        // Disable Right Click
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        }, false);

        // Disable Dragging (images, text, etc.)
        document.addEventListener('dragstart', function (event) {
            event.preventDefault();
        });

        // Disable Text Selection
        document.addEventListener('selectstart', function (e) {
            e.preventDefault();
        });

        // Disable common inspect shortcuts
        document.onkeydown = function (e) {

            // F12
            if (e.keyCode == 123) {
                return false;
            }
            // Ctrl+Shift+I
            if (e.ctrlKey && e.shiftKey && e.keyCode == 73) {
                return false;
            }
            // Ctrl+Shift+J
            if (e.ctrlKey && e.shiftKey && e.keyCode == 74) {
                return false;
            }
            // Ctrl+Shift+C
            if (e.ctrlKey && e.shiftKey && e.keyCode == 67) {
                return false;
            }
            // Ctrl+U
            if (e.ctrlKey && e.keyCode == 85) {
                return false;
            }
            // Ctrl+S
            if (e.ctrlKey && e.keyCode == 83) {
                return false;
            }
            // Ctrl+C
            if (e.ctrlKey && e.keyCode == 67) {
                return false;
            }
            // Ctrl+X
            if (e.ctrlKey && e.keyCode == 88) {
                return false;
            }
            // Ctrl+P
            if (e.ctrlKey && e.keyCode == 80) {
                return false;
            }
        };

        // Detect DevTools opening
        let devtools = function () { };
        devtools.toString = function () {
            // When DevTools is opened, console panel opens, triggering this
            // alert("Inspecting is blocked on this site.");
        };
        console.log('%c', devtools);
