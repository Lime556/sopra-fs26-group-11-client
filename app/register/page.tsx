"use client"; // For components that need React hooks and browser APIs, SSR (server side rendering) has to be disabled. Read more here: https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering

import { useRouter } from "next/navigation"; // use NextJS router for navigation
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";
import { mapApiErrorToFields } from "@/utils/mapApiErrorToFields";
import { useState } from "react";
import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";
import styles from "@/styles/login-register.module.css";
// Optionally, you can import a CSS module or file for additional styling:
// import styles from "@/styles/page.module.css";

interface FormFieldProps {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

export default function Register() {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();

  const { set: setToken } = useLocalStorage<string>("token", ""); // note that the key we are selecting is "token" and the default value we are setting is an empty string
  const { set: setUserId } = useLocalStorage<string>("userId", "");

  const [generalMessage, setGeneralMessage] = useState<string | null>(null);

  const handleRegister = async (values: FormFieldProps) => {
    setGeneralMessage(null);
    form.setFields([
      { name: "username", errors: [] },
      { name: "email", errors: [] },
      { name: "password", errors: [] },
      { name: "passwordConfirm", errors: [] },
    ]);

    const { passwordConfirm: _passwordConfirm, ...payload } = values;

    try {
      const response = await apiService.post<User>("/users", payload);

      if (response.token) setToken(response.token);
      if (response.id) setUserId(String(response.id));

      router.replace("/lobby")
      return;
    } catch (error) {
      if (error instanceof Error) {
        const { fieldErrors, generalMessage: gm } = mapApiErrorToFields(error);

        if (fieldErrors) {
          form.setFields(
            Object.entries(fieldErrors).map(([name, message]) => ({
              name: [name],
              errors: [message as string],
            }))
          );
        }

        if (gm) {
          setGeneralMessage(gm);
        }

      } else {
        form.setFields([{ name: ["username"], errors: ["Something went wrong"] }]);
      }
      return;
    }
  };

  return (
    <div className={styles["login-register-container"]}>
      <div className={styles.card}>
        <h1>Settlers of Catan</h1>
        <p>Create your account!</p>



        <Form
          form={form}
          layout="vertical"
          onFinish={handleRegister}
        >
          
          <Form.Item
            name="username"
            label="Username"
            className={styles["form-item"]}
            rules={[{ required: true, message: "Chose a username" }]}
          >
            <div className={styles["input-wrapper"]}>
              <UserOutlined className={styles["input-icon"]} />
              <Input placeholder="Enter your username" />
            </div>
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            className={styles["form-item"]}
            rules={[{ required: true, message: "Enter an email!" }]}
          >
            <div className={styles["input-wrapper"]}>
              <MailOutlined className={styles["input-icon"]} />
              <Input placeholder="Enter an email" />
            </div>
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            className={styles["form-item"]}
            rules={[{ required: true, message: "Please input your Password!" }]}
          >
            <div className={styles["input-wrapper"]}>
              <LockOutlined className={styles["input-icon"]} />
              <Input.Password placeholder="Enter at least 6 characters" />
            </div>
          </Form.Item>

          <Form.Item
            name="passwordConfirm"
            label="Confirm your Password"
            dependencies={["password"]}
            className={styles["form-item"]}
            rules={[
              { required: true, message: "Please confirm your password." },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const pw = getFieldValue("password");
                  if (!value || value === pw) return Promise.resolve();
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <div className={styles["input-wrapper"]}>
              <LockOutlined className={styles["input-icon"]} />
              <Input.Password placeholder="Repeat your password" />
            </div>
          </Form.Item>

          <div
            style={{
              color: "red",
              textAlign: "center",
              marginTop: 8,
              marginBottom: 16,
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {generalMessage}
          </div>

          <Form.Item>
            <Button
              htmlType="submit" 
              className={styles["login-register-button"]}
            >
              Sign Up
            </Button>
          </Form.Item>

        </Form>

        {/* Log In Text */}
        <p className={styles["sign-up-login-text"]}>
          Already have an account?{" "}
          <span
            className={styles["sign-up-login-link"]}
            onClick={() => router.push("/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
};