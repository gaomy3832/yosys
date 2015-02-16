var YosysJS = new function() {
	this.script_element = document.currentScript;
	this.viz_element = undefined;

	this.url_prefix = this.script_element.src.replace(/[^/]+$/, '')

	this.load_viz = function() {
		if (this.viz_element)
			return;

		this.viz_element = document.createElement('iframe')
		this.viz_element.style.display = 'none'
		document.body.appendChild(this.viz_element);

		this.viz_element.contentWindow.document.open()
		this.viz_element.contentWindow.document.write('<script type="text/javascript" src="' + this.url_prefix + 'viz.js"></' + 'script>');
		this.viz_element.contentWindow.document.close()
	}

	this.dot_to_svg = function(dot_text) {
		return this.viz_element.contentWindow.Viz(dot_text, "svg");
	}

	this.dot_into_svg = function(dot_text, svg_element) {
		if (typeof(svg_element) == 'string')
			svg_element = document.getElementById(svg_element);
		svg_element.innerHTML = this.dot_to_svg(dot_text);
		c = svg_element.firstChild;
		while (c) {
			if (c.tagName == 'svg') {
				while (c.firstChild)
					svg_element.appendChild(c.firstChild);
				svg_element.setAttribute('viewBox', c.getAttribute('viewBox'));
				// svg_element.removeChild(c);
				break;
			}
			c = c.nextSibling;
		}
	}

	this.create = function(reference_element, on_ready) {
		var ys = new Object();
		ys.init_script = "";
		ys.ready = false;
		ys.verbose = false;
		ys.echo = false;

		if (typeof(reference_element) == 'string')
			reference_element = document.getElementById(reference_element);

		if (reference_element) {
			if (reference_element.tagName == 'textarea')
				ys.init_script = reference_element.value;
		
			if (reference_element.tagName == 'iframe') {
				ys.iframe_element = reference_element;
			} else {
				ys.iframe_element = document.createElement('iframe');
				ys.iframe_element.id = reference_element.id;
				for (i in reference_element.style)
					ys.iframe_element.style[i] = reference_element.style[i];
				reference_element.parentNode.insertBefore(ys.iframe_element, reference_element);
				reference_element.parentNode.removeChild(reference_element);
			}
		} else {
			ys.iframe_element = document.createElement('iframe');
			ys.iframe_element.style.display = 'none';
			document.body.appendChild(ys.iframe_element);
		}

		ys.print_buffer = "";
		ys.last_line_empty = false;
		ys.got_normal_log_message = false;
		ys.window = ys.iframe_element.contentWindow;

		var doc = ys.window.document;
		var mod = ys.window.Module = {
			print: function(text) {
				if (typeof(text) == 'number')
					return;
				ys.print_buffer += text + "\n";
				ys.got_normal_log_message = true;
				if (ys.verbose) {
					ys.last_line_empty = text == "";
					span = doc.createElement('span');
					span.textContent = text + "\n";
					span.style.fontFamily = 'monospace';
					span.style.whiteSpace = 'pre';
					doc.body.appendChild(span);
					ys.window.scrollTo(0, doc.body.scrollHeight)
				}
				ys.ready = true;
			},
			printErr: function(text) {
				if (typeof(text) == 'number')
					return;
				if (ys.got_normal_log_message) {
					ys.print_buffer += text + "\n";
					ys.last_line_empty = text == "";
					span = doc.createElement('span');
					span.textContent = text + "\n";
					span.style.fontFamily = 'monospace';
					span.style.whiteSpace = 'pre';
					span.style.color = 'red';
					doc.body.appendChild(span);
					ys.window.scrollTo(0, doc.body.scrollHeight)
				} else {
					console.log(text);
				}
			},
		};

		ys.write = function(text) {
			ys.print_buffer += text + "\n";
			ys.last_line_empty = text == "";
			span = doc.createElement('span');
			span.textContent = text + "\n";
			span.style.fontFamily = 'monospace';
			span.style.whiteSpace = 'pre';
			doc.body.appendChild(span);
			ys.window.scrollTo(0, doc.body.scrollHeight)
		}

		ys.prompt = function() {
			return mod.ccall('prompt', 'string', [], [])
		}

		ys.run = function(cmd) {
			ys.print_buffer = "";
			if (ys.echo) {
				if (!ys.last_line_empty)
					ys.write("");
				ys.write(ys.prompt() + cmd);
			}
			mod.ccall('run', '', ['string'], [cmd]);
			return ys.print_buffer;
		}

		ys.read_file = function(filename) {
			return ys.window.FS.readFile(filename, {encoding: 'utf8'});
		}

		ys.write_file = function(filename, text) {
			return ys.window.FS.writeFile(filename, text, {encoding: 'utf8'});
		}

		ys.read_dir = function(dirname) {
			return ys.window.FS.readdir(dirname);
		}

		el = doc.createElement('script');
		el.type = 'text/javascript';
		el.src = this.url_prefix + 'yosys.js';
		doc.head.appendChild(el);

		if (on_ready || ys.init_script) {
			function check_ready() {
				if (ys.ready) {
					if (ys.init_script) {
						ys.write_file("/script.ys", ys.init_script);
						ys.run("script /script.ys");
					}
					if (on_ready)
						on_ready(ys);
				} else
					window.setTimeout(check_ready, 100);
			}
			window.setTimeout(check_ready, 100);
		}

		return ys;
	}
}
