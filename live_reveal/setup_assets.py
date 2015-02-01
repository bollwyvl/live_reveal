import os
from IPython.html.nbextensions import install_nbextension
from IPython.utils.path import locate_profile


def setup_assets(profile='default', verbose=False):
    livereveal_dir = os.path.join(os.path.dirname(__file__),
                                  'static', 'livereveal')
    custom_js_entry = '\nrequire(["/nbextensions/livereveal/js/main.js"]);\n'

    print("Install the livereveal nbextension...")

    install_nbextension(livereveal_dir, verbose=verbose, symlink=True, user=True)

    # Enable the extension in the given profile.
    profile_dir = locate_profile(profile)
    custom_js = os.path.join(profile_dir, 'static', 'custom', 'custom.js')

    print("Requiring livereveal at startup {} ...".format(custom_js))
    with open(custom_js, "r+") as f:
        if custom_js_entry in f.read():
            print('... custom.js entry already exists')
        else:
            f.write(custom_js_entry)
            print('... wrote the custom.js entry')
