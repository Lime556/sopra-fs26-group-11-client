"use client"; // For components that need React hooks and browser APIs, SSR (server side rendering) has to be disabled. Read more here: https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering

import { useRouter } from "next/navigation"; // use NextJS router for navigation
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";
import { mapApiErrorToFields } from "@/utils/mapApiErrorToFields";
import { useState } from "react";
// Optionally, you can import a CSS module or file for additional styling:
// import styles from "@/styles/page.module.css";

interface FormFieldProps {
  username: string;
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
      { name: "password", errors: [] },
      { name: "passwordConfirm", errors: [] },
    ]);

    const { passwordConfirm: _passwordConfirm, ...payload } = values;

    try {
      const response = await apiService.post<User>("/users", payload);

      if (response.token) setToken(response.token);
      if (response.id) setUserId(String(response.id));

      router.replace("/users")
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
    <div className="register-login-container">

      <Form
        form={form}
        name="register"
        size="large"
        variant="outlined"
        onFinish={handleRegister}
        layout="vertical"
      >
        
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: "Please input your username!" }]}
        >
          <Input placeholder="Enter username" />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: "Please input your Password!" }]}
        >
          <Input.Password placeholder="Enter password" />
        </Form.Item>

        <Form.Item
          name="passwordConfirm"
          label="Confirm Password"
          dependencies={["password"]}
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
          <Input.Password placeholder="Repeat password" />
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
          <Button type="primary" htmlType="submit" className="register-login-button">
            Register
          </Button>
        </Form.Item>

        <div>
            Already have an account?{" "}
            <Button
                type="link"
                onClick={() => router.push("/login")}
                className="login-link"
            >
                Log in here
            </Button>
        </div>

      </Form>
    </div>
  );
};