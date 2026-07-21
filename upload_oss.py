#!/usr/bin/env python3
import oss2
import os
import time

# OSS 配置 - 请替换为您的实际配置
OSS_ENDPOINT = 'oss-cn-hangzhou.aliyuncs.com'
OSS_BUCKET = 'diandian-ai-chat'
OSS_KEY = os.environ.get('OSS_ACCESS_KEY_ID', '')
OSS_SECRET = os.environ.get('OSS_ACCESS_KEY_SECRET', '')

def upload_directory(local_dir, oss_prefix=''):
    """上传目录到OSS"""
    auth = oss2.Auth(OSS_KEY, OSS_SECRET)
    bucket = oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET)

    for root, dirs, files in os.walk(local_dir):
        for file in files:
            local_path = os.path.join(root, file)
            rel_path = os.path.relpath(local_path, local_dir)
            oss_path = f"{oss_prefix}{rel_path}".replace('\\', '/')

            print(f"上传: {local_path} -> {oss_path}")
            bucket.put_object_from_file(oss_path, local_path)

    print(f"\n上传完成！时间戳: {int(time.time())}")

if __name__ == '__main__':
    upload_directory('./dist')
