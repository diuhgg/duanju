#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
WSGI 入口文件
用于生产环境部署
"""

from app import app

if __name__ == "__main__":
    app.run()