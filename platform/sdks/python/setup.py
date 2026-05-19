from setuptools import setup, find_packages

setup(
    name="datamesh-sdk",
    version="1.0.0",
    description="Data Mesh Python SDK – Avro producers, consumers, and schema registry client",
    packages=find_packages(),
    python_requires=">=3.11",
    install_requires=[
        "confluent-kafka[avro]>=2.3.0",
        "requests>=2.31.0",
    ],
    extras_require={
        "dev": ["pytest>=7.0", "pytest-mock", "responses"],
    },
)
