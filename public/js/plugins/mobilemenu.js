jQuery(document).ready(function( $ ) {
            $("#menu").mmenu({
              extensions: [
                "pagedim-black",
                "theme-dark",
                "effect-menu-slide",
                "effect-listitems-slide",
                "shadow-page",
              ],
              offCanvas: {
                zposition: "front",
                position: "right",
              },
              counters: true,
              navbars: [
                {
                  position: "top",
                  content: [
                    '<img src="images/Sanmour_Logo.png" class="img-responsive" alt="Image">',
                  ],
                },
                {
                  position: "top",
                },
                {
                  position: "bottom",
                  content: [
                    "<a class='fa fa-envelope' href='#/'></a>",
                    "<a class='fa fa-twitter' href='#/'></a>",
                    "<a class='fa fa-facebook' href='#/'></a>",
                  ],
                },
              ],
            });
         });