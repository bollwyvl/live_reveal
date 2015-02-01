#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys

from setuptools import setup, find_packages
from setuptools.command.install import install as _install
from setuptools.command.develop import develop as _develop

from live_reveal.setup_assets import setup_assets

with open('live_reveal/version.py') as version:
    exec(version.read())

with open('README.md') as f:
    readme = f.read()


def proxy_cmd(_cmd):
    """
    runs a setup command, and then runs setup_assets
    """
    class Proxied(_cmd):
        """
        a proxy command
        """
        def run(self):
            _cmd.run(self)
            setup_assets()

    return Proxied


setup(
    name='live_reveal',
    version=__version__,
    description='A slide-based interface for the IPython/Jupyter Notebook',
    long_description=readme,
    author='Damian Avila',
    author_email='damian.avila@gmail.com',
    url='https://github.com/damianavila/live_reveal',
    packages=find_packages(exclude=('tests', 'notebooks')),
    include_package_data=True,
    install_requires=[
        'IPython'
    ],
    cmdclass={
        'install': proxy_cmd(_install),
        'develop': proxy_cmd(_develop)
    },
    classifiers = [
        'Framework :: IPython',
        'License :: OSI Approved :: BSD License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 2',
        'Programming Language :: Lisp',
    ],
    test_suite='nose.collector',
)
