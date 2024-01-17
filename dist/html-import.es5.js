"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }


      //
      // filtered-html-import
      //
      // This is a modified version of "html-import" from GIT at https://github.com/dsheiko/html-import,
      // developed by Dmitry Sheiko (https://github.com/dsheiko).
      // This modified version supports extracting and importing just a HTML chunck from a whole HTML input.
      // Whereas the original "html-import" allows the following statement to fetch to-be-imported HTML:
      //     <link rel="html-import" href="./some-path/block.html">
      //
      // This modified version allows the following statement instead:
      //     <link rel="html-import" name"Some_id" href="./some-path/block.html">
      //
      // So, only a HTML chunk fetched from "./some-path/block.html", and which is delimited by (if any) ...
      //     <div id="html-import" name="Some_id">
      //       This text will be imported, everything else will be discarded
      //     </div>
      // ... will be imported from the source HTML; if the attribute "name=" does not match any ...
      //     <div id="html-import" name="Some_id"> ... </div>
      // ... declared in the source HTML "./some-path/block.html", then the import will be retried as if no
      // "name=" attribute were present at all in ...
      //     <link rel="html-import" name"Some_id" href="./some-path/block.html">
      //
      // If the attribute "name=" is missing from ...
      //   <link rel="html-import" name"Some_id" href="./some-path/block.html">
      // ... that is ...
      //   <link rel="html-import" href="./some-path/block.html">
      // ... then the very first HTML chunk from source HTML "./some-path/block.html", which is delimited by
      // (if any) ...
      //     <div id="html-import" name="Whatever"> ... </div>
      // ... OR which is delimited by (if any) ...
      //     <div id="html-import"> ... </div>
      // ... will be imported.
      //
      // If a delimiter such as ...
      //     <div id="html-import" name="Some_id"> ... </div>
      // ... AND / OR
      //     <div id="html-import"> ... </div>
      // ... is missing altogether from source HTML "./some-path/block.html", then the whole, unfiltered
      // source HTML will be imported (the standard "html-import" way).
      //
      // Notice that:
      // (1) the attribute "name=" (as above) allows having a single HTML source
      //     (e.g. "./some-path/block.html") behaving as a (sorts of) library for "HTML includes".
      // (2) the modified "html-import" version behaves just as the original "html-import" does if
      //     neither ...
      //         <div id="html-import" name="Some_id"> ... </div>
      //     ... OR
      //         <div id="html-import"> ... </div>
      //     ... is found in source HTML "./some-path/block.html".
      //
      // This modified version was developed in order to make it possible to use Blogger as a provider for
      // HTML includes. It will allow to strip out Blogger's "overhead" that Blogger returns along with posts
      // hosted at Blogger.
      //
       
      (function(root, factory) {
         
        if (typeof define === "function" && define.amd) {
           define([], factory);
        } else if (typeof module === "object" && module.exports) {
                  module.exports = factory();
               } else {
                  //
                  // Browser globals (root is current window)
                  //
                  root.BloggerInclude = factory();
               }
        }
         
        (window, function() {
           
          /**
            * Declare all selectors: any / all of them will be processed
          **/
           
          const IMPORT_SELECTOR = "link[rel=html-import]";
          const WANT_DIVGRAB = "div[id=html-import]";
          
           
           
          /**
            * Invoke a given handler when DOM is ready
            * @param {function} cb
          **/
          
          function onDOMReady(cb) {
            if (document.attachEvent ? document.readyState === "complete" : 
                                       document.readyState !== "loading"  ) {
               return cb();
            }
            document.addEventListener("DOMContentLoaded", cb);
          }
           
           
           
          class HtmlImport {
             
            /**
              * Process all imports in the newly fetched HTML
              * @param {string} html
              * @param {string} chunk
              * @returns Promise
            **/
             
            extractHtml(html, chunk) {
               
              try {
                 
                const div = document.createElement("div");
                 
                var mydoc = document.implementation.createHTMLDocument();
                    mydoc.open();
                    mydoc.write(html);
                    mydoc.close();
                 
                var divgrabbed = Array.from(mydoc.querySelectorAll(WANT_DIVGRAB));
                 
                if (!divgrabbed.length) {
                   html = html; // NOP
                } else {
                   var nick   =   "";
                   var srcdiv = null;
                    
                   divgrabbed.forEach((bit) => {
                        
                       if (!srcdiv) {
                          srcdiv = bit;
                       }
                        
                       if (chunk != "") {
                           
                              nick  = bit.getAttribute("name");
                          if (nick != "") {
                             if (nick == chunk) {
                                srcdiv = bit;
                             }
                          }
                       }
                   }); // divgrabbed.forEach()
                    
                   if (!srcdiv) {
                      //
                      // something unexpected happened, this should not happen; it looks awfully insane, but
                      // it's better to be safe
                      //
                      srcdiv = mydoc; // the whole fetched HTML will be returned
                   }
                    
                   //
                   // in order to return *all* HTML elements which may exist in the located chunk, the located
                   // chunk must be extracted to a temporary place; srcdiv.innerHTML would remove HTML
                   // elements from the located chunk addressed by srcdiv
                   //
                    
                   var node = mydoc.createElement("p");
                       node.appendChild(srcdiv);
                       html = node.innerHTML;
                    
                }  // else (!divgrabbed.length)
                 
                div.innerHTML = html;
                 
                //
                // if the just imported HTML carries any references to this class, then recursively process
		// those as well
                //
                // notice that there exists a chance for an endless loop if any of the previulsy processed
                // documents carrying references to this class will lead to the loading and processing of the
                // current document yet again before this processing instance is finished
                //
                 
                var nested = Array.from(div.querySelectorAll(BLOGGER_SELECTOR));
                nested.push(...Array.from(div.querySelectorAll(LEGACY_SELECTOR)));
                return (nested.length ? this.importForElements(nested).then(() => div.innerHTML) : html);
                
              }
              catch(error) {
                console.error("extractHtml: " + error.message);
                throw new Error("extractHtml failed"); // engage the caller's error handler
              }
             
            } // extractHtml()
             
             
             
            /**
              * Process imports in a given Node
              * @param {Node} el
              * @returns {Promise}
            **/
             
            importForElement(el) {
               
              const url         = el.getAttribute("href"),
                    chunk       = el.getAttribute("name"),
                    repeat      = parseInt( el.getAttribute( "repeat" ) || 1, 10 ),
                    extractHtml = this.extractHtml.bind(this);
              var   subst       = "";
               
              return fetch(url)
                     .then((response) => {
                         subst = response;
                         if (!response.ok) {
                            var emsg = "<span style='color:red'><b>ERROR</b></span>[" + response.status +
                                                                                             "]: " + url;
                            subst = new Response(emsg, String);
                         }
                         return subst;
                      })
                     .then(response => response.text())
                     .then((html) => {
                         return extractHtml(html, chunk);
                      })
                     .then((html) => {
                         if (!el.parentNode) {
                            return;
                         }
                          
                         el.insertAdjacentHTML("beforebegin", html.repeat(repeat));
                         el.parentNode.removeChild(el);
                         return(url);
                       
                      })
                     .catch((error) => {
                         console.error("importForElement(" + url + "): " + error.message);
                         return;
                      })
            
            } // importForElement()
             
             
             
            /**
              * Load all given imports
              * @param {Node[]} imports
              * @returns {Promise}
             **/
             
            importForElements(imports) {
               
              const importForElement = this.importForElement.bind(this);
              return (Promise.all(imports.map(importForElement)));
            }
             
            /**
              * Find and process all the imports in the DOM
              * @returns {Promise}
            **/
             
             
             
            import() {
              var imports = Array.from(document.querySelectorAll(IMPORT_SELECTOR));
               
              if (!imports.length) {
                 return (Promise.resolve());
              }
              return this.importForElements(imports);
            }
          
          } // class HtmlImport
         
             
             
        const importer = new HtmlImport();
         
             
             
        /**
          * CustomEvent with support for IE (9+)
          * @param {string} type
          * @param {Object} detail
          * @returns {object}
        **/
       
        function createCustomEvent(type, detail) {
           
          try {
            return new CustomEvent(type, {detail:detail});
          } catch(e) {
            const ev = document.createEvent("CustomEvent");
            ev.initCustomEvent(type, false, false, {detail:detail});
            return ev;
          }
         
        }
       
             
             
        onDOMReady(() => {
          
          importer.import()
            .then((urls) => {
               const event = createCustomEvent("html-imports-loaded", {urls});
               document.dispatchEvent(event);
             }
        );
         
      }); // (function(root, factory) 
       
       
       
      /**
        * Load JavaScript - utility that is handy to used in conjuction with the tool
        * @param {string} url
        * @returns {Promise}
      **/
       
      importer.loadJs = (url) => {
         
        return new Promise(resolve => {
               const script = document.createElement("script");
                  
               script.src = url;
               script.onload = resolve;
               document.head.appendChild(script);
                
               }); // Promise(accepted)
         
           }; // new Promise()
         
        return (importer);
       
      })); // importer.loadJs

      //
      // HTML import
      //
